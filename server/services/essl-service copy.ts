import { EsslBaseHelper } from "../helpers/essl-base-helper";

class EsslApiService extends EsslBaseHelper {

    /**
     * Block or Unblock User
     */
    async syncUserBlockStatus(employeeCode: string, deviceSerial: string, isBlocked: boolean) {
        const blockValue = isBlocked ? "true" : "false";
        const innerXml = `<DeviceCommand_BlockUnBlockUser xmlns="http://tempuri.org/"><UserName>${this.auth.user}</UserName><Password>${this.auth.pass}</Password><DeviceSerialNumber>${deviceSerial.trim()}</DeviceSerialNumber><EmployeeCode>${employeeCode.trim()}</EmployeeCode><BlockUser>${blockValue}</BlockUser></DeviceCommand_BlockUnBlockUser>`;

        return await this.soapRequest("DeviceCommand_BlockUnBlockUser", innerXml);
    }

    /**
     * Delete Employee from eSSL
     */
    async deleteEmployee(employeeCode: string) {
        const innerXml = `<DeleteEmployee xmlns="http://tempuri.org/"><UserName>${this.auth.user}</UserName><Password>${this.auth.pass}</Password><EmployeeCode>${employeeCode.trim()}</EmployeeCode></DeleteEmployee>`;

        return await this.soapRequest("DeleteEmployee", innerXml);
    }

    /**
     * Delete Device from eSSL
     */
    async deleteDevice(deviceSerial: string) {
        const innerXml = `<DeleteDevice xmlns="http://tempuri.org/"><UserName>${this.auth.user}</UserName><Password>${this.auth.pass}</Password><DeviceSerialNumber>${deviceSerial.trim()}</DeviceSerialNumber></DeleteDevice>`;

        return await this.soapRequest("DeleteDevice", innerXml);
    }

    /**
     * Get Punch Logs for an Employee
     */
    async getEmployeePunchLogs(employeeCode: string, attendanceDate: string) {
        const innerXml = `<GetEmployeePunchLogs xmlns="http://tempuri.org/"><UserName>${this.auth.user}</UserName><Password>${this.auth.pass}</Password><EmployeeCode>${employeeCode.trim()}</EmployeeCode><AttendanceDate>${attendanceDate}</AttendanceDate></GetEmployeePunchLogs>`;

        return await this.soapRequest("GetEmployeePunchLogs", innerXml);
    }
}

export const esslService = new EsslApiService();