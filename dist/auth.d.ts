export declare class AuthManager {
    private token;
    /** Get a valid token */
    getToken(): Promise<string>;
    /** Build auth header */
    getHeaders(): Promise<Record<string, string>>;
    /** Quick token validity check */
    checkValid(): Promise<{
        valid: boolean;
        message: string;
    }>;
}
export declare const auth: AuthManager;
export declare const API_BASE = "https://clawvec.com/api";
