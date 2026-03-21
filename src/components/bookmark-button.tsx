import { toggleBookmarkAction } from "@/src/app/actions/metadata";

interface BookmarkButtonProps {
  sessionId: string;
  bookmarked: boolean;
  returnUrl: string;
  size?: "sm" | "md";
}

export function BookmarkButton({ sessionId, bookmarked, returnUrl, size = "md" }: BookmarkButtonProps) {
  const fontSize = size === "sm" ? "12px" : "16px";

  return (
    <form action={toggleBookmarkAction} style={{ display: "inline" }}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="bookmarked" value={String(bookmarked)} />
      <input type="hidden" name="returnUrl" value={returnUrl} />
      <button
        type="submit"
        title={bookmarked ? "Remove bookmark" : "Add bookmark"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize,
          padding: "0 2px",
          color: bookmarked ? "#ffaa00" : "#555555",
          fontFamily: "inherit",
        }}
      >
        {bookmarked ? "★" : "☆"}
      </button>
    </form>
  );
}
