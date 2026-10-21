import Image from "next/image";
import { site } from "@/lib/constants/site";

export function ProductShowcase() {
  return (
    <figure className="product-showcase">
      <Image
        className="product-poster"
        src={site.productImagePath}
        loading="eager"
        width={4961}
        height={3544}
        sizes="(max-width: 559px) calc(100vw - 74px), (max-width: 959px) 610px, 482px"
        alt="Cá sấu chính hãng là Jorakay — giải pháp chuyên nghiệp cho ốp lát, chống thấm và sửa chữa."
      />
    </figure>
  );
}
