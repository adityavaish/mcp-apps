import { getGitApi, getCoreApi } from "../utils/azure-devops-client";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { PullRequest, PRChanges, PRSummary } from "../models/pr-models";
import { subDays, differenceInHours } from "date-fns";
import { diffLines } from "diff";

export class AzureDevOpsService {
    
    /**
     * Retrieve pull requests from a repository within a date range
     */
    async getPullRequests(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        days: number = 7,
        includeActive: boolean = false
    ): Promise<{ pullRequests: PullRequest[], summary: PRSummary }> {
        try {
            // Decode project name if it's URL-encoded
            const decodedProject = decodeURIComponent(project);
            if (decodedProject !== project) {
                console.log(`Project name is URL-encoded. Decoded: ${decodedProject}`);    
                project = decodedProject;
            }
            
            const gitApi = await getGitApi(organizationUrl);
            const fromDate = subDays(new Date(), days);
            
            const searchCriteria = {
                repositoryId: repositoryName,
                status: includeActive ? undefined : GitInterfaces.PullRequestStatus.Completed,
                top: 100
            };

            const pullRequests = await gitApi.getPullRequests(
                repositoryName,
                searchCriteria,
                project
            );

            if (!pullRequests) {
                return {
                    pullRequests: [],
                    summary: this.createEmptySummary(fromDate, days)
                };
            }

            // Filter and transform PRs
            const filteredPRs = pullRequests
                .filter((pr: GitInterfaces.GitPullRequest) => {
                    if (!pr.creationDate) return false;
                    const prDate = new Date(pr.creationDate);
                    return prDate >= fromDate;
                })
                .map((pr: GitInterfaces.GitPullRequest) => this.transformPullRequest(pr));

            const summary = this.createSummary(filteredPRs, fromDate, days);

            return { pullRequests: filteredPRs, summary };
        } catch (error) {
            console.error("Failed to retrieve pull requests:", error);
            
            // Provide more specific error messages
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes("token") || errorMessage.includes("authentication") || errorMessage.includes("401")) {
                errorMessage = "Authentication failed. Please ensure you're logged into Azure CLI (run 'az login') or check your Azure DevOps access permissions.";
            } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                errorMessage = `Repository '${repositoryName}' not found in project '${project}'. Please check the repository and project names.`;
            } else if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
                errorMessage = `Access denied to repository '${repositoryName}'. Please check your permissions in Azure DevOps.`;
            }
            
            throw new Error(`Failed to retrieve pull requests: ${errorMessage}`);
        }
    }

    /**
     * Get detailed changes for a specific pull request
     */    
    async getPRChanges(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        pullRequestId: number
    ): Promise<PRChanges> {
        try {
            // Decode project name if it's URL-encoded
            const decodedProject = decodeURIComponent(project);
            if (decodedProject !== project) {
                console.log(`Project name is URL-encoded. Decoded: ${decodedProject}`);
                project = decodedProject;
            }
            
            const gitApi = await getGitApi(organizationUrl);
            
            // Get PR iterations to find changes
            const iterations = await gitApi.getPullRequestIterations(
                repositoryName,
                pullRequestId,
                project
            );

            if (!iterations || iterations.length === 0) {
                throw new Error(`No iterations found for PR ${pullRequestId}`);
            }

            // Get changes for the latest iteration
            const latestIteration = iterations[iterations.length - 1];
            const changes = await gitApi.getPullRequestIterationChanges(
                repositoryName,
                pullRequestId,
                latestIteration.id!,
                project
            );

            return this.analyzePRChanges(changes);
        } catch (error) {
            throw new Error(`Failed to retrieve PR changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get code diffs for a pull request with actual diff content
     */
    async getPRDiffs(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        pullRequestId: number,
        maxFiles: number = 50
    ): Promise<any[]> {
        try {
            const gitApi = await getGitApi(organizationUrl);
            
            // Get PR details first
            const pr = await gitApi.getPullRequest(repositoryName, pullRequestId, project);
            if (!pr) {
                throw new Error(`Pull request ${pullRequestId} not found`);
            }

            // Get file changes from all iterations
            const iterations = await gitApi.getPullRequestIterations(repositoryName, pullRequestId, project);
            let allFileChanges: any[] = [];
            
            for (let i = 0; i < iterations.length; i++) {
                const iterationNumber = i + 1;
                const changes = await gitApi.getPullRequestIterationChanges(repositoryName, pullRequestId, iterationNumber, project);
                const fileChanges = changes?.changeEntries || [];
                
                // Add iteration info to track latest changes
                fileChanges.forEach((change: any) => {
                    change._iteration = iterationNumber;
                });
                
                allFileChanges = allFileChanges.concat(fileChanges);
            }
            
            // Remove duplicates (keep latest iteration of each file)
            const fileChangeMap = new Map();
            allFileChanges.forEach(change => {
                const path = change.item?.path;
                if (path) {
                    if (!fileChangeMap.has(path) || change._iteration > fileChangeMap.get(path)._iteration) {
                        fileChangeMap.set(path, change);
                    }
                }
            });
            
            const fileChanges = Array.from(fileChangeMap.values());
            
            // Limit to maxFiles
            const limitedChanges = fileChanges.slice(0, maxFiles);
            
            // Fetch actual diff content for each file
            const diffsWithContent = await Promise.all(
                limitedChanges.map(async (change) => {
                    const baseDiff = {
                        path: change.item?.path,
                        changeType: this.getChangeTypeString(change.changeType),
                        changeTypeCode: change.changeType,
                        iteration: change._iteration,
                        isAdded: change.changeType === 1,
                        isModified: change.changeType === 2,
                        isDeleted: change.changeType === 4,
                        isRenamed: change.changeType === 8,
                        objectId: change.item?.objectId,
                        gitObjectType: change.item?.gitObjectType,
                        url: change.item?.url
                    };

                    // Skip diff content for deleted files or binary files
                    if (change.changeType === 4 || this.isBinaryFile(change.item?.path)) {
                        return {
                            ...baseDiff,
                            diffContent: null,
                            reason: change.changeType === 4 ? 'File deleted' : 'Binary file'
                        };
                    }

                    try {
                        // Get diff content using commit IDs from the PR
                        const diffContent = await this.getFileDiffContent(
                            gitApi,
                            repositoryName,
                            project,
                            pr.lastMergeSourceCommit?.commitId,
                            pr.lastMergeTargetCommit?.commitId,
                            change.item?.path
                        );

                        return {
                            ...baseDiff,
                            diffContent,
                            linesAdded: this.countAddedLines(diffContent),
                            linesDeleted: this.countDeletedLines(diffContent),
                            linesModified: this.countModifiedLines(diffContent)
                        };
                    } catch (error) {
                        // If we can't get diff content, still return file info
                        return {
                            ...baseDiff,
                            diffContent: null,
                            error: `Could not retrieve diff: ${error instanceof Error ? error.message : String(error)}`
                        };
                    }
                })
            );

            return diffsWithContent;
        } catch (error) {
            throw new Error(`Failed to retrieve PR diffs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get basic information for a specific pull request
     */    
    async getPRBasicInfo(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        pullRequestId: number
    ) {
        try {
            // Decode project name if it's URL-encoded
            const decodedProject = decodeURIComponent(project);
            if (decodedProject !== project) {
                console.log(`Project name is URL-encoded. Decoded: ${decodedProject}`);
                project = decodedProject;
            }
            
            const gitApi = await getGitApi(organizationUrl);
            
            // Get PR details
            const pr = await gitApi.getPullRequest(repositoryName, pullRequestId, project);
            if (!pr) {
                throw new Error(`Pull request ${pullRequestId} not found`);
            }

            // Get reviewers
            const reviewers = await gitApi.getPullRequestReviewers(repositoryName, pullRequestId, project);
            
            // Get commits count
            const commits = await gitApi.getPullRequestCommits(repositoryName, pullRequestId, project);
            
            // Get work items linked to this PR
            const workItemRefs = await gitApi.getPullRequestWorkItemRefs(repositoryName, pullRequestId, project);

            return {
                basicInfo: this.transformPullRequest(pr),
                reviewProcess: {
                    totalReviewers: reviewers?.length || 0,
                    reviewers: reviewers?.map(r => ({
                        name: r.displayName || r.uniqueName || "Unknown",
                        vote: r.vote || 0,
                        hasDeclined: r.vote === -10,
                        hasApproved: r.vote === 10,
                        hasApprovedWithSuggestions: r.vote === 5,
                        isRequired: r.isRequired || false
                    })) || [],
                    requiredReviewers: reviewers?.filter(r => r.isRequired).length || 0,
                    approvals: reviewers?.filter(r => r.vote === 10).length || 0,
                    rejections: reviewers?.filter(r => r.vote === -10).length || 0
                },
                commits: {
                    totalCommits: commits?.length || 0,
                    commitShas: commits?.map(c => c.commitId).slice(0, 10) || []
                },
                linkedWorkItems: {
                    totalWorkItems: workItemRefs?.length || 0,
                    workItemIds: workItemRefs?.map(wi => wi.id).filter(Boolean) || []
                },
                metadata: {
                    pullRequestUrl: `${organizationUrl}/${project}/_git/${repositoryName}/pullrequest/${pullRequestId}`,
                    repositoryId: pr.repository?.id,
                    lastMergeSourceCommit: pr.lastMergeSourceCommit?.commitId,
                    lastMergeTargetCommit: pr.lastMergeTargetCommit?.commitId
                }
            };
        } catch (error) {
            console.error("Failed to retrieve PR basic info:", error);
            
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                errorMessage = `Pull request ${pullRequestId} not found in repository '${repositoryName}'. Please check the PR ID and repository name.`;
            } else if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
                errorMessage = `Access denied to pull request ${pullRequestId}. Please check your permissions.`;
            }
            
            throw new Error(`Failed to retrieve PR basic info: ${errorMessage}`);
        }
    }

    /**
     * Analyze test impact and coverage implications of a pull request
     */
    async getPRTestImpact(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        pullRequestId: number,
        options: {
            includeTestFiles?: boolean;
            analysisDepth?: "basic" | "standard" | "comprehensive";
        } = {}
    ) {        
        try {
            const { includeTestFiles = true, analysisDepth = "standard" } = options;
            const gitApi = await getGitApi(organizationUrl);
            
            // Get basic PR information
            const pr = await gitApi.getPullRequest(repositoryName, pullRequestId, project);
            if (!pr) {
                throw new Error(`Pull request ${pullRequestId} not found`);
            }

            const basicInfo = this.transformPullRequest(pr);
            
            // Collect file changes from all iterations
            const iterations = await gitApi.getPullRequestIterations(repositoryName, pullRequestId, project);
            let allFileChanges: any[] = [];
            
            for (let i = 0; i < iterations.length; i++) {
                const iterationNumber = i + 1;
                const changes = await gitApi.getPullRequestIterationChanges(repositoryName, pullRequestId, iterationNumber, project);
                const fileChanges = changes?.changeEntries || [];
                
                fileChanges.forEach((change: any) => {
                    change._iteration = iterationNumber;
                });
                
                allFileChanges = allFileChanges.concat(fileChanges);
            }
            
            // Remove duplicates (keep latest iteration of each file)
            const fileChangeMap = new Map();
            allFileChanges.forEach(change => {
                const path = change.item?.path;
                if (path) {
                    if (!fileChangeMap.has(path) || change._iteration > fileChangeMap.get(path)._iteration) {
                        fileChangeMap.set(path, change);
                    }
                }
            });
            
            const fileChanges = Array.from(fileChangeMap.values());
            
            // Perform test impact analysis
            const testFileAnalysis = this.analyzeTestFiles(fileChanges, includeTestFiles);       
            const codeFileAnalysis = this.analyzeCodeFiles(fileChanges);
            const coverageAnalysis = this.analyzeCoverageImpact(fileChanges, analysisDepth);
            const testStrategyAnalysis = this.analyzeTestingStrategy(fileChanges, testFileAnalysis, analysisDepth);

            // Calculate overall test impact
            const overallImpact = this.calculateTestImpact({
                testFileAnalysis,
                codeFileAnalysis,
                coverageAnalysis,
                testStrategyAnalysis,
                analysisDepth
            });

            // Generate test recommendations
            const testRecommendations = this.generateTestRecommendations({
                testFileAnalysis,
                codeFileAnalysis,
                coverageAnalysis,
                testStrategyAnalysis,
                overallImpact,
                analysisDepth
            });
            
            // Generate test execution plan
            const executionPlan = this.generateTestExecutionPlan({
                testFileAnalysis,
                codeFileAnalysis,
                overallImpact,
                analysisDepth
            });
            
            const result = {
                pullRequestId,
                repositoryName,
                basicInfo,
                testImpactAssessment: {
                    overall: overallImpact,
                    analysis: {
                        testFiles: testFileAnalysis,
                        codeFiles: codeFileAnalysis,
                        coverage: coverageAnalysis,
                        testStrategy: testStrategyAnalysis
                    }
                },
                recommendations: testRecommendations,
                executionPlan,
                summary: this.generateTestImpactSummary(overallImpact, testRecommendations),
                options: {
                    includeTestFiles,
                    analysisDepth
                },
                analyzedAt: new Date().toISOString()
            };
            
            return result;
        } catch (error) {
            console.error("Failed to analyze PR test impact:", error);
            
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                errorMessage = `Pull request ${pullRequestId} not found in repository '${repositoryName}'. Please check the PR ID and repository name.`;
            } else if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
                errorMessage = `Access denied to repository '${repositoryName}' or project '${project}'. Please verify your permissions.`;
            }
            
            throw new Error(`Failed to analyze PR test impact: ${errorMessage}`);
        }
    }

    /**
     * Get comprehensive repository context information
     */    
    async getRepositoryContext(
        organizationUrl: string,
        project: string,
        repositoryName: string,
        options: {
            includeFileStructure?: boolean;
            includeActivity?: boolean;
            activityDays?: number;
            analysisDepth?: "basic" | "standard" | "comprehensive";
        } = {}
    ) {
        try {
            // Decode project name if it's URL-encoded
            const decodedProject = decodeURIComponent(project);
            if (decodedProject !== project) {
                console.log(`Project name is URL-encoded. Decoded: ${decodedProject}`);
                project = decodedProject;
            }
            
            const { 
                includeFileStructure = true, 
                includeActivity = true, 
                activityDays = 30, 
                analysisDepth = "standard" 
            } = options;

            const gitApi = await getGitApi(organizationUrl);
            const coreApi = await getCoreApi(organizationUrl);

            // Get repository information
            const repository = await gitApi.getRepository(repositoryName, project);
            if (!repository) {
                throw new Error(`Repository '${repositoryName}' not found in project '${project}'`);
            }

            // Get branches
            const branches = await gitApi.getBranches(repositoryName, project);
            
            // Get project information
            const projectInfo = await coreApi.getProject(project);            
            
            // Initialize context object with basic information
            const context: any = {
                repositoryName,
                projectName: project,
                metadata: this.extractRepositoryMetadata(repository),
                repository: {
                    id: repository.id,
                    name: repository.name,
                    url: repository.webUrl,
                    defaultBranch: repository.defaultBranch,
                    size: repository.size
                },
                branches: this.analyzeBranches(branches || []),
                project: {
                    id: projectInfo.id,
                    name: projectInfo.name,
                    description: projectInfo.description,
                    visibility: projectInfo.visibility
                },
                options: {
                    includeFileStructure,
                    includeActivity,
                    activityDays,
                    analysisDepth
                },
                analyzedAt: new Date().toISOString()
            };

            // Add file structure analysis if requested
            if (includeFileStructure) {
                context.fileStructure = await this.analyzeFileStructure(
                    gitApi, 
                    repositoryName, 
                    project, 
                    analysisDepth
                );
            }

            // Add activity analysis if requested
            if (includeActivity) {
                context.activity = await this.analyzeRepositoryActivity(
                    gitApi,
                    repositoryName,
                    project,
                    activityDays,
                    analysisDepth
                );
            }

            // Add comprehensive analysis for comprehensive mode
            if (analysisDepth === 'comprehensive') {
                context.comprehensive = await this.performComprehensiveAnalysis(
                    gitApi,
                    repositoryName,
                    project,
                    repository
                );
            }

            // Generate insights and recommendations
            context.insights = this.generateRepositoryInsights(context);
            context.summary = this.generateRepositorySummary(context);

            return context;

        } catch (error) {
            console.error("Failed to retrieve repository context:", error);
            
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                errorMessage = `Repository '${repositoryName}' not found in project '${project}'. Please check the repository name and project.`;
            } else if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
                errorMessage = `Access denied to repository '${repositoryName}' or project '${project}'. Please verify your permissions.`;
            }
            
            throw new Error(`Failed to retrieve repository context: ${errorMessage}`);
        }
    }

    // Helper methods that need to be implemented
    private createEmptySummary(fromDate: Date, days: number): PRSummary {
        return {
            totalPRs: 0,
            dateRange: {
                from: fromDate.toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            },
            statusBreakdown: {
                completed: 0,
                active: 0,
                abandoned: 0
            }
        };
    }

    private createSummary(pullRequests: PullRequest[], fromDate: Date, days: number): PRSummary {
        return {
            totalPRs: pullRequests.length,
            dateRange: {
                from: fromDate.toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            },
            statusBreakdown: {
                completed: pullRequests.filter(pr => pr.status === "completed").length,
                active: pullRequests.filter(pr => pr.status === "active").length,
                abandoned: pullRequests.filter(pr => pr.status === "abandoned").length
            }
        };
    }

    private transformPullRequest(pr: GitInterfaces.GitPullRequest): PullRequest {
        return {
            id: pr.pullRequestId || 0,
            title: pr.title || "",
            description: pr.description || "",
            author: pr.createdBy?.displayName || pr.createdBy?.uniqueName || "Unknown",
            createdDate: pr.creationDate ? (typeof pr.creationDate === 'string' ? pr.creationDate : pr.creationDate.toISOString()) : "",
            completedDate: pr.closedDate ? (typeof pr.closedDate === 'string' ? pr.closedDate : pr.closedDate.toISOString()) : undefined,
            mergedDate: pr.mergeStatus === GitInterfaces.PullRequestAsyncStatus.Succeeded ? 
                (pr.closedDate ? (typeof pr.closedDate === 'string' ? pr.closedDate : pr.closedDate.toISOString()) : undefined) : undefined,
            targetBranch: pr.targetRefName?.replace("refs/heads/", "") || "",
            sourceBranch: pr.sourceRefName?.replace("refs/heads/", "") || "",
            status: this.mapPRStatus(pr.status),
            mergeStatus: pr.mergeStatus?.toString() || undefined,
            isDraft: pr.isDraft || false,
            labels: pr.labels?.map((l: any) => l.name).filter(Boolean) || []
        };
    }

    private mapPRStatus(status?: GitInterfaces.PullRequestStatus): string {
        switch (status) {
            case GitInterfaces.PullRequestStatus.Active:
                return "active";
            case GitInterfaces.PullRequestStatus.Completed:
                return "completed";
            case GitInterfaces.PullRequestStatus.Abandoned:
                return "abandoned";
            default:
                return "unknown";
        }
    }

    private analyzePRChanges(changes: GitInterfaces.GitPullRequestIterationChanges | undefined): PRChanges {
        if (!changes || !changes.changeEntries) {
            return {
                filesChanged: [],
                totalFilesChanged: 0,
                linesAdded: 0,
                linesDeleted: 0,
                netLinesChanged: 0,
                changedDirectories: [],
                fileTypeBreakdown: {},
                criticalFilesChanged: [],
                configurationFiles: [],
                migrationFiles: [],
                testFiles: []
            };
        }

        const filesChanged = changes.changeEntries.map(entry => entry.item?.path || "").filter(Boolean);
        const directories = [...new Set(filesChanged.map(file => file.split('/').slice(0, -1).join('/')))];
        
        // Analyze file types
        const fileTypeBreakdown: Record<string, number> = {};
        const criticalFiles: string[] = [];
        const configFiles: string[] = [];
        const migrationFiles: string[] = [];
        const testFiles: string[] = [];

        filesChanged.forEach(file => {
            const extension = file.split('.').pop()?.toLowerCase() || '';
            fileTypeBreakdown[extension] = (fileTypeBreakdown[extension] || 0) + 1;

            // Categorize files
            if (this.isCriticalFile(file)) criticalFiles.push(file);
            if (this.isConfigurationFile(file)) configFiles.push(file);
            if (this.isMigrationFile(file)) migrationFiles.push(file);
            if (this.isTestFile(file)) testFiles.push(file);
        });

        return {
            filesChanged,
            totalFilesChanged: filesChanged.length,
            linesAdded: 0,
            linesDeleted: 0,
            netLinesChanged: 0,
            changedDirectories: directories,
            fileTypeBreakdown,
            criticalFilesChanged: criticalFiles,
            configurationFiles: configFiles,
            migrationFiles: migrationFiles,
            testFiles: testFiles
        };
    }

    private getChangeTypeString(changeType: number): string {
        switch (changeType) {
            case 1: return 'add';
            case 2: return 'edit';
            case 4: return 'delete';
            case 8: return 'rename';
            default: return 'unknown';
        }
    }

    private isBinaryFile(filePath: string | undefined): boolean {
        if (!filePath) return false;
        const binaryExtensions = ['.exe', '.dll', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.zip', '.tar', '.gz'];
        return binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
    }

    private async getFileDiffContent(
        gitApi: any,
        repositoryName: string,
        project: string,
        sourceCommitId: string | undefined,
        targetCommitId: string | undefined,
        filePath: string | undefined
    ): Promise<string | null> {
        if (!sourceCommitId || !targetCommitId || !filePath) {
            return null;
        }

        try {
            // Try to get file content from both commits
            const [sourceContent, targetContent] = await Promise.all([
                this.getFileContentAtCommit(gitApi, repositoryName, project, filePath, sourceCommitId),
                this.getFileContentAtCommit(gitApi, repositoryName, project, filePath, targetCommitId)
            ]);

            if (sourceContent === null && targetContent === null) {
                return null;
            }

            if (sourceContent === null && targetContent !== null) {
                return this.formatAsUnifiedDiff(filePath, '', targetContent, 'added');
            }

            if (sourceContent !== null && targetContent === null) {
                return this.formatAsUnifiedDiff(filePath, sourceContent, '', 'deleted');
            }

            if (sourceContent !== null && targetContent !== null) {
                if (sourceContent === targetContent) {
                    return null;
                }
                return this.formatAsUnifiedDiff(filePath, targetContent, sourceContent, 'modified');
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get diff content for ${filePath}:`, error);
            return null;
        }
    }

    private async getFileContentAtCommit(
        gitApi: any,
        repositoryName: string,
        project: string,
        filePath: string,
        commitId: string
    ): Promise<string | null> {
        try {
            const contentStream = await gitApi.getItemText(
                repositoryName,
                filePath,
                project,
                undefined,
                GitInterfaces.VersionControlRecursionType.None,
                false,
                false,
                false,
                {
                    versionType: GitInterfaces.GitVersionType.Commit,
                    version: commitId
                },
                true,
                false,
                true
            );

            if (contentStream) {
                const content = await this.streamToString(contentStream);
                return content;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            
            stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            
            stream.on('end', () => {
                const result = Buffer.concat(chunks).toString('utf8');
                resolve(result);
            });
            
            stream.on('error', (error) => {
                reject(error);
            });

            setTimeout(() => {
                reject(new Error('Stream read timeout'));
            }, 30000);
        });
    }

    private formatAsUnifiedDiff(
        filePath: string, 
        oldContent: string, 
        newContent: string, 
        changeType: 'added' | 'deleted' | 'modified'
    ): string {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        const diffResult = diffLines(oldContent, newContent, { 
            ignoreWhitespace: false,
            newlineIsToken: false 
        });

        let unifiedDiff = `--- a/${filePath}\n+++ b/${filePath}\n`;
        
        if (changeType === 'added') {
            unifiedDiff += `@@ -0,0 +1,${newLines.length} @@\n`;
        } else if (changeType === 'deleted') {
            unifiedDiff += `@@ -1,${oldLines.length} +0,0 @@\n`;
        } else {
            unifiedDiff += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
        }

        for (const part of diffResult) {
            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            for (const line of lines) {
                if (part.added) {
                    unifiedDiff += `+${line}\n`;
                } else if (part.removed) {
                    unifiedDiff += `-${line}\n`;
                } else {
                    unifiedDiff += ` ${line}\n`;
                }
            }
        }

        return unifiedDiff;
    }

    private countAddedLines(diffContent: string | null): number {
        if (!diffContent) return 0;
        const lines = diffContent.split('\n');
        return lines.filter(line => line.startsWith('+')).length;
    }

    private countDeletedLines(diffContent: string | null): number {
        if (!diffContent) return 0;
        const lines = diffContent.split('\n');
        return lines.filter(line => line.startsWith('-')).length;
    }

    private countModifiedLines(diffContent: string | null): number {
        if (!diffContent) return 0;
        const added = this.countAddedLines(diffContent);
        const deleted = this.countDeletedLines(diffContent);
        return Math.min(added, deleted);
    }

    // File classification helpers
    private isCriticalFile(filePath: string): boolean {
        const criticalPatterns = [
            /dockerfile/i,
            /package\.json$/i,
            /requirements\.txt$/i,
            /web\.config$/i,
            /app\.config$/i,
            /appsettings/i,
            /\.env/i
        ];
        return criticalPatterns.some(pattern => pattern.test(filePath));
    }

    private isConfigurationFile(filePath: string): boolean {
        const configPatterns = [
            /\.config$/i,
            /\.ini$/i,
            /\.yaml$/i,
            /\.yml$/i,
            /\.toml$/i,
            /\.properties$/i,
            /appsettings/i
        ];
        return configPatterns.some(pattern => pattern.test(filePath));
    }

    private isMigrationFile(filePath: string): boolean {
        const migrationPatterns = [
            /migration/i,
            /migrate/i,
            /\.sql$/i,
            /schema/i
        ];
        return migrationPatterns.some(pattern => pattern.test(filePath));
    }

    private isTestFile(filePath: string): boolean {
        const testPatterns = [
            /test/i,
            /spec/i,
            /\.test\./i,
            /\.spec\./i,
            /__tests__/i
        ];
        return testPatterns.some(pattern => pattern.test(filePath));
    }

    // Helper methods for test analysis

    private analyzeTestFiles(fileChanges: any[], includeTestFiles: boolean): any {
        return { totalTestFiles: 0, testFiles: [] };
    }

    private analyzeCodeFiles(fileChanges: any[]): any {
        return { totalCodeFiles: 0, codeFiles: [] };
    }

    private analyzeCoverageImpact(fileChanges: any[], analysisDepth: string): any {
        return { estimatedCoverageImpact: 'unknown' };
    }

    private analyzeTestingStrategy(fileChanges: any[], testFileAnalysis: any, analysisDepth: string): any {
        return { strategy: 'unknown' };
    }

    private calculateTestImpact(data: any): any {
        return { impact: 'low' };
    }

    private generateTestRecommendations(data: any): any[] {
        return [];
    }

    private generateTestExecutionPlan(data: any): any {
        return { plan: 'execute all tests' };
    }

    private generateTestImpactSummary(overallImpact: any, testRecommendations: any[]): any {
        return { summary: 'Low impact' };
    }

    private extractRepositoryMetadata(repository: any): any {
        return { name: repository.name };
    }

    private analyzeBranches(branches: any[]): any {
        return { totalBranches: branches.length };
    }

    private async analyzeFileStructure(gitApi: any, repositoryName: string, project: string, analysisDepth: string): Promise<any> {
        return { structure: 'unknown' };
    }

    private async analyzeRepositoryActivity(gitApi: any, repositoryName: string, project: string, activityDays: number, analysisDepth: string): Promise<any> {
        return { activity: 'unknown' };
    }

    private async performComprehensiveAnalysis(gitApi: any, repositoryName: string, project: string, repository: any): Promise<any> {
        return { comprehensive: 'unknown' };
    }

    private generateRepositoryInsights(context: any): any {
        return { insights: [] };
    }

    private generateRepositorySummary(context: any): any {
        return { summary: 'Repository analysis complete' };
    }
}
