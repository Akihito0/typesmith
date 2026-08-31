import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOpengraphImage,
} from "@/frontend/system/OpengraphImage";

// Next reads alt/size/contentType off this route file itself, so the contract
// stays here and only the artwork lives in frontend/.
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOpengraphImage();
}
