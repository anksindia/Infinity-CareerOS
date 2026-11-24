import type { AppProps } from "next/app";
import "../index.css";
import "pdfjs-dist/legacy/web/pdf_viewer.css";

export default function WebApp({ Component, pageProps }: AppProps) {
	return <Component {...pageProps} />;
}
