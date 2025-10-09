let http = require("http");
let url = require("url");
const {
  notFound,
  wrongPath,
  alreadyExists,
  numberRequest,
  invalidWord,
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

    if (pathname !== "/api/definitions/") {
      res.statusCode = 404; // Not found
      res.end(JSON.stringify(wrongPath));
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204; // No content (for preflight)
      res.end();
    } else if (req.method === "GET") {
      this.handleGet(req, res);
    } else if (req.method === "POST") {
      this.handlePost(req, res);
    } else {
      this.setCommonHeaders(res);
      res.statusCode = 405; // Method not allowed
      res.end(JSON.stringify({ message: methodNotAllowed }));
      return;
    }
  }

  isValidWord(word) {
    return /^[A-Za-z\s]+$/.test(word);
  }

  handleGet(req, res) {
    const q = url.parse(req.url, true);
    const word = q.query.word;

    if (!word || word.trim() === "" || !this.isValidWord(word)) {
      res.statusCode = 400; // Bad request
      res.end(JSON.stringify({ message: invalidWord }));
      return;
    }

    const entry = this.dictionary.find((e) => {
      if (e.word) return e.word.toLowerCase() === word.toLowerCase();
    });

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
          message: notFound
            .replace("%1", this.totalRequests)
            .replace("%2", word),
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
      const parsed = JSON.parse(query);
      const word = parsed.word;
      const definition = parsed.definition;
      console.log(word);
      console.log(definition);

      const entry = this.dictionary.find((e) => {
        if (e.word) return e.word.toLowerCase() === word.toLowerCase();
      });

      if (entry) {
        res.statusCode = 409; // Conflict (adding a word that exists in the dictionary already)
        res.write(
          JSON.stringify({
            message: alreadyExists.replace("%1", entry.word),
            requestNumber: this.totalRequests,
          })
        );
      } else {
        this.dictionary.push({ word: word, definition: definition });

        this.totalEntries += 1;

        res.write(
          JSON.stringify({
            message: numberRequest
              .replace("%1", this.totalRequests)
              .replace("%2", this.totalEntries),
            requestNumber: this.totalRequests,
          })
        );
      }

      res.end();
    });
  }
}

new Server(10000).start();
