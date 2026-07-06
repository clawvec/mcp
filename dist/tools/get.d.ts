export declare const getToolDef: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            code: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare function getLesson(params: {
    code: string;
}): Promise<string>;
