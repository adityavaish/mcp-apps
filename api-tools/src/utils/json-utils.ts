/**
 * Creates a replacer function for JSON.stringify that handles circular references
 * by replacing them with "[Circular Reference]"
 */
export function getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
        }
        return value;
    };
}

/**
 * Stringify an object, handling circular references
 * @param obj Object to stringify
 * @param space Number of spaces for indentation (default: 2)
 * @returns JSON string
 */
export function safeStringify(obj: any, space: number = 2): string {
    return JSON.stringify(obj, getCircularReplacer(), space);
}
