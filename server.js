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
  constructor(port = 10000) {
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
    try {
      this.totalRequests++;

      this.setCommonHeaders(res);

      const q = url.parse(req.url, true);
      const pathname = q.pathname;

      if (pathname !== "/api/definitions/") {
        res.statusCode = 404; // Not found
        res.end(
          JSON.stringify({
            message: wrongPath,
            requestNumber: this.totalRequests,
          })
        );
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
        res.statusCode = 405; // Method not allowed - Used ChatGPT here to find appropriate status code
        res.end(
          JSON.stringify({
            message: methodNotAllowed,
            requestNumber: this.totalRequests,
          })
        );
        return;
      }
    } catch {
      res.statusCode = 500; // Internal server error
      res.end(
        JSON.stringify({
          message: "Internal Server Error",
          requestNumber: this.totalRequests,
        })
      );
    }
  }

  isValidWord(word) {
    return /^[A-Za-z\s]+$/.test(word); // Used ChatGPT here to find the regex pattern for parsing valid word
  }

  handleGet(req, res) {
    const q = url.parse(req.url, true);
    const word = q.query.word;

    if (!word || word.trim() === "" || !this.isValidWord(word)) {
      res.statusCode = 400; // Bad request
      res.end(
        JSON.stringify({
          message: invalidWord,
          requestNumber: this.totalRequests,
        })
      );
      return;
    }

    const entry = this.dictionary.find((e) => {
      if (e.word) return e.word.toLowerCase() === word.toLowerCase();
    });

    if (entry) {
      res.statusCode = 200; // OK
      res.end(
        JSON.stringify({
          word: entry.word,
          definition: entry.definition,
          requestNumber: this.totalRequests,
        })
      );
    } else {
      res.statusCode = 404; // Not found
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

      const entry = this.dictionary.find((e) => {
        if (e.word) return e.word.toLowerCase() === word.toLowerCase();
      });

      if (entry) {
        res.statusCode = 409; // Conflict (adding a word that exists in the dictionary already) - Used ChatGPT to find status code
        res.write(
          JSON.stringify({
            message: alreadyExists.replace("%1", entry.word),
            requestNumber: this.totalRequests,
          })
        );
      } else {
        this.dictionary.push({ word: word, definition: definition });
        this.totalEntries += 1;
        res.statusCode = 201; // Created - Used ChatGPT to find status code
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
