type PageNoticeProps = {
    error?: string;
    message?: string;
};

/** Recado vindo de um redirect (?message= ou ?error=). */
export function PageNotice({ error, message }: PageNoticeProps) {
    if (error) {
        return (
            <p
                className="rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-5 py-4 text-sm text-sloth-ink"
                role="alert"
            >
                {error}
            </p>
        );
    }

    if (message) {
        return (
            <p
                className="rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-5 py-4 text-sm font-medium text-sloth-forest"
                role="status"
            >
                {message}
            </p>
        );
    }

    return null;
}
