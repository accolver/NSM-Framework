export class NSMClient {
  static isNip07Available() {
    return false;
  }

  async discoverApplications() {
    return [];
  }

  async connect() {
    return;
  }

  disconnect() {
    return;
  }
}