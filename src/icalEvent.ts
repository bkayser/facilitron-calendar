
export function icalEvent(
    uid: string,
    start: Date,
    end: Date,
    summary: string,
    description?: string,
    location?: string,
    sequence?: number, // Optional sequence for versioning, if needed
    status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' // Optional status attribute, if needed
): string {
    /** Consider a status attribute that can be CONFIRMED, TENTATIVE, or CANCELLED. */
    /*
     * The SEQUENCE property can be used to indicate the version of the event.
     */
    return [
        `BEGIN:VEVENT`,
        `UID:${uid}`,
        `DTSTART:${start.toISOString().replace(/[-:]/g, '').slice(0, 15)}`, // Format to YYYYMMDDTHHMMSS
        `DTEND:${end.toISOString().replace(/[-:]/g, '').slice(0, 15)}`,
        `SUMMARY:${summary}`,
        ...(description ? [`DESCRIPTION:${description}`] : []),
        ...(location ? [`LOCATION:${location}`] : []),
        `END:VEVENT`
    ].join('\n');
}