export declare const searchToolDef: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query: {
                type: string;
                description: string;
            };
            domain: {
                type: string;
                description: string;
            };
            type: {
                type: string;
                description: string;
            };
            system: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
                default: number;
            };
        };
        required: string[];
    };
};
interface SearchParams {
    query: string;
    domain?: string;
    type?: string;
    system?: string;
    limit?: number;
}
export declare function searchLessons(params: SearchParams): Promise<string>;
export {};
