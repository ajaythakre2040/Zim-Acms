import axios, { AxiosInstance } from "axios";

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
            timeout: 10000,
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "User-Agent": "PostmanRuntime/7.37.3",
            },
        });
    }

    /**
     * Common method to wrap any XML body into a SOAP Envelope
     */
    private buildSoapEnvelope(innerXml: string): string {
        return `<?xml version="1.0" encoding="utf-8"?>\r\n<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\r\n  <soap:Body>\r\n${innerXml}\r\n  </soap:Body>\r\n</soap:Envelope>`;
    }

    /**
     * Generic SOAP Requester
     */
    private async soapRequest(action: string, xmlBody: string) {
        const fullEnvelope = this.buildSoapEnvelope(xmlBody);

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
            const errorMessage = error.response?.data || error.message;
            throw new Error(`ESSL_COMMUNICATION_ERROR: ${errorMessage}`);
        }
    }

    /**
     * Method: Block or Unblock User
     */
    async syncUserBlockStatus(employeeCode: string, deviceSerial: string, isBlocked: boolean) {
        // const blockValue = isBlocked ? 1 : 0;
        const blockValue = isBlocked ? "true" : "false";

        const innerXml = `    <DeviceCommand_BlockUnBlockUser xmlns="http://tempuri.org/">\r\n` +
            `      <UserName>${this.auth.user}</UserName>\r\n` +
            `      <Password>${this.auth.pass}</Password>\r\n` +
            `      <DeviceSerialNumber>${deviceSerial}</DeviceSerialNumber>\r\n` +
            `      <EmployeeCode>${employeeCode}</EmployeeCode>\r\n` +
            `      <BlockUser>${blockValue}</BlockUser>\r\n` +
            `    </DeviceCommand_BlockUnBlockUser>`;

        return this.soapRequest("DeviceCommand_BlockUnBlockUser", innerXml);
    }

    // Future API Example:
    // async getAttendance(fromDate: string, toDate: string) {
    //   const innerXml = `<GetAttendance... />`;
    //   return this.soapRequest("GetAttendance", innerXml);
    // }
}

export const esslService = new EsslApiService();