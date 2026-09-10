declare module 'word-extractor' {
  interface ExtractedDocument {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getFooters(): string;
    getAnnotations(): string;
    getTextboxes(): string;
  }

  class WordExtractor {
    constructor();
    extract(documentPathOrBuffer: string | Buffer): Promise<ExtractedDocument>;
  }

  export = WordExtractor;
}
