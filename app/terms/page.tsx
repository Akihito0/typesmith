import type { Metadata } from "next";
import { DocChrome, DocHeader, DocBody, DocSection } from "@/components/landing/DocChrome";

export const metadata: Metadata = {
  title: "Terms — TypeSmith",
  description:
    "The terms of use for TypeSmith — a free, no-signup typography tool provided as-is during beta.",
};

export default function TermsPage() {
  return (
    <DocChrome>
      <DocHeader
        label="Legal / Terms"
        title="Terms of use"
        lede="TypeSmith is a free tool offered as-is. These terms are deliberately short — read them once and get back to work."
        meta="Last updated — 19 July 2026"
      />
      <DocBody>
        <DocSection index="01" title="Acceptance">
          <p>
            By using TypeSmith you agree to these terms. If you do not agree with them, please
            don&apos;t use the tool.
          </p>
        </DocSection>

        <DocSection index="02" title="The service">
          <p>
            TypeSmith generates type scales, checks contrast, pairs fonts, and previews mockups —
            entirely in your browser, at no cost. It is currently in <strong>beta</strong>: features
            may change, move, or be removed as it develops, and Professional layouts are free while
            that beta lasts.
          </p>
        </DocSection>

        <DocSection index="03" title="Your content">
          <p>
            You own everything you create. Because your work never leaves your device, we make no
            claim to it, store no copy of it, and grant ourselves no license over it. What you make
            is yours to use, publish, and sell.
          </p>
        </DocSection>

        <DocSection index="04" title="Acceptable use">
          <p>
            Use TypeSmith lawfully. Don&apos;t attempt to disrupt, reverse the hosting of, or misuse
            the service, and don&apos;t use it to produce material that is unlawful. The source is
            open — build on it within its license rather than abusing the hosted copy.
          </p>
        </DocSection>

        <DocSection index="05" title="No warranty">
          <p>
            TypeSmith is provided <strong>&ldquo;as is,&rdquo;</strong> without warranties of any
            kind. Contrast grades, scale values, and exports are offered as a design aid — verify
            them against your own requirements before shipping to production. We don&apos;t
            guarantee the tool will be uninterrupted or error-free.
          </p>
        </DocSection>

        <DocSection index="06" title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, TypeSmith and its maintainers are not liable for
            any indirect, incidental, or consequential damages arising from your use of the tool.
          </p>
        </DocSection>

        <DocSection index="07" title="Changes">
          <p>
            These terms may be updated; the date above always reflects the current version.
            Continuing to use TypeSmith after a change means you accept it. The full history lives
            in the <a href="/changelog">changelog</a>.
          </p>
        </DocSection>
      </DocBody>
    </DocChrome>
  );
}
