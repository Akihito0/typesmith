import type { Metadata } from "next";
import { DocChrome, DocHeader, DocBody, DocSection } from "@/frontend/landing/DocChrome";
import { pageUrlMetadata } from "@/backend/site";

export const metadata: Metadata = {
  title: "Privacy — TypeSmith",
  description:
    "TypeSmith runs entirely in your browser. No account, no server, no tracking — here is exactly what that means.",
  ...pageUrlMetadata("/privacy"),
};

export default function PrivacyPage() {
  return (
    <DocChrome>
      <DocHeader
        label="Legal / Privacy"
        title="Privacy"
        lede="TypeSmith has no backend. There is no account to create and no server to send your work to — so most of a privacy policy simply does not apply. Here is the whole of it."
        meta="Last updated — 19 July 2026"
      />
      <DocBody>
        <DocSection index="01" title="The short version">
          <p>
            Everything happens in your browser. TypeSmith is a static application with no account
            system, no database, and no server that receives your projects. We cannot see what you
            design, because it never reaches us.
          </p>
        </DocSection>

        <DocSection index="02" title="What stays on your device">
          <p>
            Your work autosaves to your browser&apos;s <strong>localStorage</strong> under the keys{" "}
            <code>typesmith-project</code> and <code>typesmith-workspace</code>. That data lives
            only on the device you used, is never transmitted, and is removed the moment you clear
            the site&apos;s data or use a private window.
          </p>
        </DocSection>

        <DocSection index="03" title="Share links">
          <p>
            A share link encodes your <em>entire</em> project into the URL itself (the{" "}
            <code>?s=</code> parameter) and decodes it in the recipient&apos;s browser — nothing is
            stored on our side. The trade-off: anyone holding the link can read the project it
            contains. <strong>Treat a share link like the work it carries.</strong>
          </p>
        </DocSection>

        <DocSection index="04" title="Fonts">
          <p>
            The curated typefaces are bundled with the app. When you load a Google Fonts face, your
            browser fetches it from Google&apos;s CDN (<code>fonts.gstatic.com</code>), and that
            request reaches Google under their own policy. Fonts you upload yourself are held in
            memory for the session only — they are never uploaded anywhere.
          </p>
        </DocSection>

        <DocSection index="05" title="Analytics & cookies">
          <p>
            None. No analytics scripts, no tracking pixels, no advertising cookies, no
            fingerprinting. The only browser storage we use is the localStorage above, and it exists
            purely to keep your own work between visits.
          </p>
        </DocSection>

        <DocSection index="06" title="Changes & contact">
          <p>
            Any change to this policy is posted on this page with a new date. Questions or concerns
            are welcome on{" "}
            <a href="https://github.com/Akihito0/typesmith/issues" target="_blank" rel="noreferrer">
              GitHub
            </a>
            .
          </p>
        </DocSection>
      </DocBody>
    </DocChrome>
  );
}
