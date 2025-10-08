let http = require("http");
let url = require("url");
const {
  doesNotExist,
  wrongPath,
  alreadyExists,
  numberRequest,
  emptyInput,
} = require("./lang/en/en");

class Server {
  constructor(port = 8000) {
    this.dictionary = [];
    this.totalRequests = 0;
    this.totalEntries = 0;
    this.port = port;
  }

  start() {
    http
      .createServer((req, res) => this.handleRequest(req, res))
      .listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });
  }

  setCommonHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");
  }

  handleRequest(req, res) {
    this.totalRequests += 1;

    this.setCommonHeaders(res);

    const q = url.parse(req.url, true);
    const pathname = q.pathname;

    if (pathname !== "/api/definitions") {
      res.setHeader("Content-Type", "text/plain");
      res.statusCode = 404;
      res.end(wrongPath);
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
    } else if (req.method === "GET") {
      this.handleGet(req, res);
    } else if (req.method === "POST") {
      this.handlePost(req, res);
    } else {
      this.setCommonHeaders(res);
      res.setHeader("Content-Type", "text/plain");
      res.statusCode = 405;
      res.end(methodNotAllowed);
      return;
    }
  }

  handleGet(req, res) {
    const q = url.parse(req.url, true);
    const word = q.query.word;

    if (!word || word.trim() === "") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end(emptyInput);
      return;
    }

    const entry = this.dictionary.find(
      (e) => e.word.toLowerCase() === word.toLowerCase()
    );

    if (entry) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          word: entry.word,
          definition: entry.definition,
          requestNumber: this.totalRequests,
        })
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `Word '${word}' not found`,
          requestNumber: this.totalRequests,
        })
      );
    }
  }

  handlePost(req, res) {
    let query = "";
    req.on("data", (chunk) => {
      query += chunk;
    });

    req.on("end", () => {
      let params = new URLSearchParams(query);
      let word = params.get("word");
      let definition = params.get("definition");

      const entry = this.dictionary.find(
        (e) => e.word.toLowerCase() === word.toLowerCase()
      );

      if (entry) {
        res.statusCode = 409;
        res.write(alreadyExists.replace("%1", entry.word));
      } else {
        this.dictionary.push({ word, definition });
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Access-Control-Allow-Origin", "*");
        this.totalEntries += 1;
        res.write(
          `${numberRequest.replace(
            "%1",
            this.totalRequests
          )} ${numberRequest.replace("%2", this.totalEntries)}.`
        );
      }

      res.end();
    });
  }
}

new Server(10000).start();
