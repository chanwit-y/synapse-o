/**
 * @file Logo.tsx
 * @description Component that displays the application logo image using Next.js Image component.
 */

import Image from "next/image";
import l from "../../asset/logo.png";

export default function Logo() {
  return (
    <Image
      src={l}
      alt="Synapse Logo"
      width={32}
      height={32}
      className="h-10 w-10"
    />
  );
}

