import { toMailtoPlainText } from "./emailBody";

describe("toMailtoPlainText", () => {
  it("keeps paragraph and line breaks without HTML tags", () => {
    expect(toMailtoPlainText("<p>Hello <strong>Aditi</strong></p><p>Next<br>line</p>"))
      .toBe("Hello Aditi\nNext\nline");
  });

  it("decodes HTML stored as text inside the editor", () => {
    const body = '<p>&lt;img src="https://example.com/header.png"&gt;&lt;p&gt;Hi Aditi,&lt;/p&gt;&lt;p&gt;See you there.&lt;/p&gt;</p>';
    expect(toMailtoPlainText(body)).toBe("Hi Aditi,\nSee you there.");
  });

  it("keeps a link destination in the plain-text email", () => {
    expect(toMailtoPlainText('<p>View <a href="https://example.com/event">the event</a></p>'))
      .toBe("View the event (https://example.com/event)");
  });

  it("removes source tags from a deeply encoded generated email", () => {
    const email = '<img src="https://example.com/header.png"><p>Hi Aditi,</p><p>Visit <a href="https://example.com/event">the event</a>.</p>';
    const encode = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const editorHtml = `<p>${encode(encode(encode(encode(email))))}</p>`;

    expect(toMailtoPlainText(editorHtml)).toBe("Hi Aditi,\nVisit the event (https://example.com/event).");
  });
});
