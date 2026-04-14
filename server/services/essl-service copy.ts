import axios, { AxiosInstance } from "axios";
import http from 'http';
class EsslApiService {
    private client: AxiosInstance;
    private readonly url: string;
    private readonly auth: { user: string; pass: string };

    constructor() {
        this.url = process.env.ESSL_API_URL || "";
        this.auth = {
            user: process.env.ESSL_USERNAME || "essl",
            pass: process.env.ESSL_PASSWORD || "essl",
        };

        this.client = axios.create({
            baseURL: this.url,
            timeout: 30000, // 30 seconds
            httpAgent: new http.Agent({ keepAlive: true, maxSockets: 10 }), // Ek baar mein 1 hi connection
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "User-Agent": "PostmanRuntime/7.37.3",
            },
        });
    }

    private buildSoapEnvelope(innerXml: string): string {
        return `<?xml version="1.0" encoding="utf-8"?>\r\n<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\r\n  <soap:Body>\r\n${innerXml}\r\n  </soap:Body>\r\n</soap:Envelope>`;
    }

    /**
     * Generic SOAP Requester with Retry Logic
     */
    private async soapRequest(action: string, xmlBody: string, retries = 1) {
        const fullEnvelope = this.buildSoapEnvelope(xmlBody);

        for (let i = 0; i <= retries; i++) {
            try {
                const response = await this.client.post("", fullEnvelope, {
                    headers: {
                        SOAPAction: `http://tempuri.org/${action}`,
                    },
                });

                const data = response.data;

                if (data.includes("<DeviceCommand_BlockUnBlockUserResult>error</DeviceCommand_BlockUnBlockUserResult>")) {
                    throw new Error(`ESSL_API_REJECTED: Server returned error for ${action}`);
                }

                return data;

            } catch (error: any) {
                const isTimeout = error.code === 'ECONNABORTED';
                const isLastRetry = i === retries;

                if (isTimeout && !isLastRetry) {
                    console.warn(`   🔄 [RETRY] Attempt ${i + 1} failed for ${action}. Retrying...`);
                    continue; // Agli koshish karo
                }

                // Agar timeout hai toh readable message do
                const errorMessage = isTimeout
                    ? `TIMEOUT: Machine didn't respond in 25s at ${this.url}`
                    : (error.response?.data || error.message);

                throw new Error(`ESSL_COMM_ERROR: ${errorMessage}`);
            }
        }
    }

    // server/essl-service.ts

    async syncUserBlockStatus(employeeCode: string, deviceSerial: string, isBlocked: boolean) {
        // 💡 FIX 1: eSSL SOAP parser hamesha lowercase 'true'/'false' expect karta hai
        const blockValue = isBlocked ? "true" : "false";

        // 💡 FIX 2: Delay zaroori hai (Thoda kam kar diya hai fast sync ke liye)
        await new Promise(res => setTimeout(res, 2000));

        // 💡 FIX 3: XML ko ekdam "Flat" rakho, koi extra spaces ya newlines nahi
        const innerXml = `<DeviceCommand_BlockUnBlockUser xmlns="http://tempuri.org/"><UserName>${this.auth.user}</UserName><Password>${this.auth.pass}</Password><DeviceSerialNumber>${deviceSerial.trim()}</DeviceSerialNumber><EmployeeCode>${employeeCode.trim()}</EmployeeCode><BlockUser>${blockValue}</BlockUser></DeviceCommand_BlockUnBlockUser>`;

        console.log(`📡 [SOAP SEND] Device: ${deviceSerial} | Emp: ${employeeCode} | Action: ${blockValue}`);

        try {
            const result = await this.soapRequest("DeviceCommand_BlockUnBlockUser", innerXml);
            return result;
        } catch (error: any) {
            // Agar fir bhi error aaye, toh error log ko clean rakhein
            throw error;
        }
    }
}

export const esslService = new EsslApiService();