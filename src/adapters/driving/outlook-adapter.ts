import { PublicClientApplication, DeviceCodeRequest } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

export class OutlookAdapter {
  private client?: Client;

  async authenticate(): Promise<void> {
    const msalConfig = {
      auth: {
        clientId: process.env.AZURE_CLIENT_ID || "",
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || "common"}`,
      },
    };

    const pca = new PublicClientApplication(msalConfig);

    const deviceCodeRequest: DeviceCodeRequest = {
      deviceCodeCallback: (response) => console.log(response.message),
      scopes: ["user.read", "mail.read", "mail.send"],
    };

    try {
      const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
      if (response) {
        this.client = Client.init({
          authProvider: (done) => done(null, response.accessToken),
        });
        console.log("Outlook Authenticated successfully!");
      }
    } catch (error) {
      console.error("Authentication Error:", error);
    }
  }

  async getCurrentUser() {
    if (!this.client) throw new Error("Outlook not authenticated");
    return await this.client.api("/me").select("displayName").get();
  }

  async getLatestEmails(top = 10) {
    if (!this.client) throw new Error("Outlook not authenticated");
    return await this.client
      .api("/me/messages")
      .select("id,subject,body,bodyPreview,from,receivedDateTime") // Lấy thêm 'body' chứa HTML
      .orderby("receivedDateTime desc")
      .top(top)
      .get();
  }

  async replyAll(messageId: string, htmlContent: string) {
    if (!this.client) throw new Error("Outlook not authenticated");
    const reply = {
      comment: htmlContent,
    };
    return await this.client.api(`/me/messages/${messageId}/replyAll`).post(reply);
  }
}
