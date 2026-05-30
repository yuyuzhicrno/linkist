export class Low {
  constructor(adapter, data) {
    this.adapter = adapter;
    this.data = data || {};
  }
  async read() { return this; }
  async write() { return this; }
}

export class JSONFile {
  constructor(filename) {
    this.filename = filename;
  }
}