import xmlrpc from "xmlrpc";

export class OdooAdapter {
  private url: string;
  private db: string;
  private username: string;
  private pass: string;
  private uid: number | null = null;

  constructor() {
    this.url = process.env.ODOO_URL || "";
    this.db = process.env.ODOO_DB || "";
    this.username = process.env.ODOO_USERNAME || "";
    this.pass = process.env.ODOO_PASSWORD || "";
  }

  private async getUid(): Promise<number> {
    if (this.uid) return this.uid;
    const common = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/common`);
    return new Promise((resolve, reject) => {
      common.methodCall("authenticate", [this.db, this.username, this.pass, {}], (err, value) => {
        if (err) return reject(err);
        this.uid = value;
        resolve(value);
      });
    });
  }

  async getTicketData(ticketId: string): Promise<any> {
    const uid = await this.getUid();
    const models = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
    
    return new Promise((resolve, reject) => {
      // Giả sử model ticket là 'helpdesk.ticket' hoặc tương tự
      models.methodCall("execute_kw", [
        this.db, uid, this.pass,
        "helpdesk.ticket", "read",
        [[parseInt(ticketId)]],
        { fields: ["name", "description", "x_student_name", "x_amount_paid", "stage_id"] }
      ], (err, value) => {
        if (err) return reject(err);
        resolve(value[0]);
      });
    });
  }
}
