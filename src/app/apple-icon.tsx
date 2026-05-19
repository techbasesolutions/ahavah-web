// Satori (the renderer behind ImageResponse) consumes JSX as a layout
// description, not real DOM — there is no className/cva path here, and
// inline `style` is the documented API. The design-system lint rule
// against inline styles doesn't apply.
/* eslint-disable no-restricted-syntax */
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E0040",
          borderRadius: 40,
        }}
      >
        <svg
          width="145"
          height="145"
          viewBox="0 0 145 145"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M67.7677 29.1329C74.8346 28.497 82.1993 30.1794 88.4938 33.3976C97.8192 38.1597 104.86 46.4444 108.057 56.4154C112.848 71.3487 109.488 82.3457 102.728 95.5076C107.944 96.8715 110.019 97.1291 115.192 98.1545C115.403 100.551 115.866 106.267 114.443 108.047C110.694 112.732 98.3044 107.959 94.5211 105.082C91.4563 107.766 88.0684 110.06 84.4359 111.907C70.5855 118.866 50.7145 118.44 39.1702 107.318C30.9223 99.37 29.1828 89.0905 32.7669 78.5538C33.6752 76.5657 34.8513 74.711 36.2624 73.0417C44.0893 63.7896 57.7061 62.928 68.0198 68.1619C73.8877 71.1396 77.5088 75.5554 82.0833 80.0588C85.4134 83.3521 88.875 86.5098 92.4598 89.5241C96.8002 82.0263 98.8984 74.8331 97.6724 66.0881C94.9604 46.7454 74.566 35.2311 57.2677 45.6514C52.898 48.2837 50.3703 52.357 47.4033 56.3705C42.1762 54.8322 40.4335 54.2021 36.2436 50.9248C42.0286 37.5872 53.8697 30.9664 67.7677 29.1329Z"
            fill="#D7FF81"
          />
          <path
            d="M54.1348 77.7702C65.0972 77.4352 69.2156 84.1011 76.2181 91.1931C78.9263 93.9358 81.0222 95.8002 84.0349 98.2127C80.1833 100.455 77.3305 101.887 73.1084 103.258C65.39 105.146 55.6735 104.485 49.2626 99.5276C44.3941 95.7625 40.7496 87.4988 45.1307 82.0646C47.5332 79.0849 50.5075 78.1993 54.1348 77.7702Z"
            fill="#0E0040"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
