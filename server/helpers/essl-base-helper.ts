import axios, { AxiosInstance } from "axios";
import http from 'http';

export class EsslBaseHelper {
    protected client: AxiosInstance;
    protected readonly auth: { user: string; pass: string };

    constructor() {
        // Auth aur URL .env se load honge
        this.auth = {
            user: process.env.ESSL_USERNAME || "essl",
            pass: process.env.ESSL_PASSWORD || "essl",
        };

        this.client = axios.create({
            baseURL: process.env.ESSL_API_URL || "",
            timeout: 30000,
            httpAgent: new http.Agent({ keepAlive: true, maxSockets: 10 }),
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "User-Agent": "PostmanRuntime/7.37.3",
            },
        });
    }

    private buildSoapEnvelope(innerXml: string): string {
        // XML ko clean aur compact rakhta hai
        return `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>${innerXml}</soap:Body>
        </soap:Envelope>`.replace(/>\s+</g, '><').trim();
    }

    /**
     * Common SOAP Requester with Retry Logic
     */
    protected async soapRequest(action: string, xmlBody: string, retries = 1): Promise<any> {
        const fullEnvelope = this.buildSoapEnvelope(xmlBody);

        for (let i = 0; i <= retries; i++) {
            try {
                const response = await this.client.post("", fullEnvelope, {
                    headers: {
                        SOAPAction: `http://tempuri.org/${action}`,
                    },
                });

                const data = response.data;

                // Error handling for eSSL specific rejection
                if (data.includes(`<${action}Result>error</${action}Result>`)) {
                    throw new Error(`ESSL_API_REJECTED: Server returned error for ${action}`);
                }

                return data;
            } catch (error: any) {
                const isTimeout = error.code === 'ECONNABORTED';
                const isLastRetry = i === retries;

                if (isTimeout && !isLastRetry) {
                    console.warn(`🔄 [RETRY] Attempt ${i + 1} for ${action}`);
                    continue;
                }

                const errorMessage = isTimeout
                    ? `TIMEOUT: Machine didn't respond at ${process.env.ESSL_API_URL}`
                    : (error.response?.data || error.message);

                throw new Error(`ESSL_COMM_ERROR: ${errorMessage}`);
            }
        }
    }
}