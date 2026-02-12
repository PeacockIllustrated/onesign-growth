import { requireAdmin } from '@/lib/auth';
import { getComponentDetail, getArtworkJob } from '@/lib/artwork/actions';
import { notFound } from 'next/navigation';
import { formatDate, getComponentTypeLabel, getLightingTypeLabel } from '@/lib/artwork/utils';
import { DIMENSION_TOLERANCE_MM } from '@/lib/artwork/types';
import { createServerClient } from '@/lib/supabase-server';

export default async function ArtworkCompliancePrintPage({
    params,
}: {
    params: Promise<{ id: string; componentId: string }>;
}) {
    await requireAdmin();

    const { id, componentId } = await params;
    const [component, job] = await Promise.all([
        getComponentDetail(componentId),
        getArtworkJob(id),
    ]);

    if (!component || !job) {
        notFound();
    }

    // Count versions for display
    const versionNumber = component.versions.length + 1;
    const extraItems = component.extra_items || [];
    const hasExtraItems = extraItems.length > 0;

    // Generate a signed URL for the thumbnail if it exists
    let thumbnailUrl: string | null = null;
    if (component.artwork_thumbnail_url) {
        const supabase = await createServerClient();
        const urlParts = component.artwork_thumbnail_url.split('/artwork-assets/');
        if (urlParts.length > 1) {
            const storagePath = urlParts[1];
            const { data } = await supabase.storage
                .from('artwork-assets')
                .createSignedUrl(storagePath, 3600);
            thumbnailUrl = data?.signedUrl || null;
        }
    }

    return (
        <>
            <style>{`
                /* ===== A4 LANDSCAPE SINGLE-PAGE PRINT ===== */
                /* Printable area: 277mm x 190mm (A4 landscape minus 10mm margins) */

                @media print {
                    @page {
                        margin: 10mm;
                        size: A4 landscape;
                    }
                    html, body {
                        width: 277mm;
                        height: 190mm;
                        overflow: hidden;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .compliance-sheet {
                        width: 277mm !important;
                        height: 186mm !important;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Gilroy', 'Inter', system-ui, -apple-system, sans-serif;
                    color: #000;
                    background: #fff;
                }

                .compliance-sheet {
                    width: 277mm;
                    height: 190mm;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .compliance-sheet-body {
                    display: flex;
                    flex: 1;
                    min-height: 0;
                    border: 1px solid #000;
                    border-bottom: none;
                    overflow: hidden;
                }

                /* LEFT: Design Authority (60%) */
                .design-authority {
                    width: 60%;
                    padding: 4mm 5mm;
                    border-right: 2px solid #000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* RIGHT: Production Checklist (40%) */
                .production-checklist {
                    width: 40%;
                    padding: 4mm 5mm;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* --- Shared typography --- */

                .sheet-header {
                    border-bottom: 2px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 3mm;
                    flex-shrink: 0;
                }

                .sheet-header h1 {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    margin: 0;
                    line-height: 1.2;
                }

                .sheet-header h2 {
                    font-size: 9px;
                    font-weight: 400;
                    color: #555;
                    margin: 1px 0 0 0;
                    line-height: 1.2;
                }

                .section-title {
                    font-size: 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #000;
                    border-bottom: 1px solid #000;
                    padding-bottom: 1mm;
                    margin-bottom: 2mm;
                    margin-top: 2.5mm;
                    flex-shrink: 0;
                }

                /* --- Left: Artwork thumbnail --- */

                .artwork-thumbnail-container {
                    border: 1px solid #ddd;
                    background: #fafafa;
                    padding: 2mm;
                    margin-bottom: 2mm;
                    text-align: center;
                    height: 55mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .artwork-thumbnail-container img {
                    max-width: 100%;
                    max-height: 51mm;
                    object-fit: contain;
                }

                .artwork-thumbnail-container .no-artwork {
                    color: #999;
                    font-size: 9px;
                    font-style: italic;
                }

                /* --- Left: Spec table --- */

                .spec-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                    margin-bottom: 1mm;
                    flex-shrink: 0;
                }

                .spec-table td {
                    padding: 1mm 1mm;
                    border-bottom: 1px solid #eee;
                    vertical-align: top;
                    line-height: 1.3;
                }

                .spec-table td:first-child {
                    font-weight: 500;
                    color: #555;
                    width: 30%;
                    white-space: nowrap;
                }

                .spec-table td:last-child {
                    font-weight: 600;
                    color: #000;
                }

                /* --- Left: Confirmations --- */

                .confirmation-item {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    font-size: 9px;
                    padding: 0.5mm 0;
                    flex-shrink: 0;
                }

                .checkbox-filled {
                    width: 3mm;
                    height: 3mm;
                    border: 1.5px solid #000;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 7px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                /* --- Right: Empty checkboxes --- */

                .checkbox-empty {
                    width: 3.5mm;
                    height: 3.5mm;
                    border: 1.5px solid #000;
                    display: inline-block;
                    flex-shrink: 0;
                }

                .checkbox-line {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    padding: 1mm 0;
                    font-size: 9px;
                    flex-shrink: 0;
                }

                /* --- Right: Measurement fields --- */

                .measurement-field {
                    border-bottom: 1px dotted #999;
                    width: 25mm;
                    height: 4mm;
                    display: inline-block;
                }

                .measurement-row {
                    display: flex;
                    align-items: center;
                    gap: 2mm;
                    font-size: 9px;
                    padding: 1mm 0;
                    flex-shrink: 0;
                }

                /* --- Signature blocks --- */

                .signature-block {
                    margin-top: auto;
                    padding-top: 2mm;
                    border-top: 1px solid #ddd;
                    flex-shrink: 0;
                }

                .signature-line {
                    display: flex;
                    align-items: flex-end;
                    gap: 2mm;
                    font-size: 8px;
                    color: #555;
                    padding: 1.5mm 0;
                }

                .signature-line .line {
                    flex: 1;
                    border-bottom: 1px solid #000;
                    min-height: 4mm;
                }

                /* --- Right: Notes area --- */

                .notes-area {
                    margin-top: 2mm;
                    flex-shrink: 0;
                }

                .notes-area .notes-lines {
                    border-bottom: 1px dotted #ccc;
                    height: 5mm;
                    margin-bottom: 0.5mm;
                }

                /* --- Left: File path --- */

                .file-path {
                    font-family: 'Courier New', monospace;
                    font-size: 7px;
                    word-break: break-all;
                    line-height: 1.2;
                    flex-shrink: 0;
                }

                /* --- Footer --- */

                .footer-meta {
                    font-size: 7px;
                    color: #999;
                    text-align: center;
                    padding: 1mm 2mm;
                    border: 1px solid #000;
                    border-top: 1px solid #ddd;
                    flex-shrink: 0;
                }

                /* --- Right: Dimension check box --- */

                .dimension-check-section {
                    margin-top: 2mm;
                    padding: 2mm;
                    border: 1px solid #ddd;
                    background: #fafafa;
                    font-size: 8px;
                    flex-shrink: 0;
                }

                .dimension-check-section .title {
                    font-weight: 700;
                    font-size: 7px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #555;
                    margin-bottom: 1mm;
                }

                /* --- Design notes (clamped) --- */

                .design-notes {
                    font-size: 8px;
                    color: #333;
                    line-height: 1.3;
                    max-height: 12mm;
                    overflow: hidden;
                    flex-shrink: 0;
                }
            `}</style>

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        if (typeof window !== 'undefined') {
                            Promise.all([
                                document.fonts ? document.fonts.ready : Promise.resolve(),
                                ...Array.from(document.images).map(function(img) {
                                    return img.complete ? Promise.resolve() : new Promise(function(r) { img.onload = r; img.onerror = r; });
                                })
                            ]).then(function() {
                                setTimeout(function() { window.print(); }, 500);
                            });
                        }
                    `,
                }}
            />

            {/* Print hint */}
            <div className="no-print" style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5' }}>
                <p style={{ fontSize: '14px', color: '#666' }}>
                    artwork compliance sheet — print dialog will open automatically
                </p>
            </div>

            {/* Compliance Sheet — fixed to A4 landscape printable area */}
            <div className="compliance-sheet">
                <div className="compliance-sheet-body">
                {/* LEFT: Design Authority (60%) */}
                <div className="design-authority">
                    <div className="sheet-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1>design authority</h1>
                                <h2>{job.job_reference} — {component.name}</h2>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '8px', color: '#555' }}>
                                <div style={{ fontWeight: 600 }}>{getComponentTypeLabel(component.component_type)}</div>
                                <div>v{versionNumber}</div>
                            </div>
                        </div>
                    </div>

                    {/* Artwork Thumbnail */}
                    <div className="artwork-thumbnail-container">
                        {thumbnailUrl ? (
                            <img
                                src={thumbnailUrl}
                                alt={`Artwork: ${component.name}`}
                            />
                        ) : (
                            <span className="no-artwork">no artwork thumbnail uploaded</span>
                        )}
                    </div>

                    {/* Build Specifications */}
                    <div className="section-title">build specifications</div>
                    {hasExtraItems ? (
                        <table className="spec-table">
                            <thead>
                                <tr>
                                    <td></td>
                                    <td style={{ fontWeight: 700, fontSize: '8px', textAlign: 'center' }}>A</td>
                                    {extraItems.map(item => (
                                        <td key={item.id} style={{ fontWeight: 700, fontSize: '8px', textAlign: 'center' }}>{item.label}</td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>width</td>
                                    <td style={{ textAlign: 'center' }}>{component.width_mm ? `${component.width_mm} mm` : '—'}</td>
                                    {extraItems.map(item => (
                                        <td key={item.id} style={{ textAlign: 'center' }}>{item.width_mm ? `${item.width_mm} mm` : '—'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>height</td>
                                    <td style={{ textAlign: 'center' }}>{component.height_mm ? `${component.height_mm} mm` : '—'}</td>
                                    {extraItems.map(item => (
                                        <td key={item.id} style={{ textAlign: 'center' }}>{item.height_mm ? `${item.height_mm} mm` : '—'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>returns</td>
                                    <td style={{ textAlign: 'center' }}>{component.returns_mm ? `${component.returns_mm} mm` : 'n/a'}</td>
                                    {extraItems.map(item => (
                                        <td key={item.id} style={{ textAlign: 'center' }}>{item.returns_mm ? `${item.returns_mm} mm` : 'n/a'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>material</td>
                                    <td colSpan={1 + extraItems.length} style={{ textAlign: 'center' }}>{component.material || '—'}</td>
                                </tr>
                                {component.lighting && (
                                    <tr>
                                        <td>lighting</td>
                                        <td colSpan={1 + extraItems.length} style={{ textAlign: 'center' }}>{getLightingTypeLabel(component.lighting)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="spec-table">
                            <tbody>
                                <tr>
                                    <td>width</td>
                                    <td>{component.width_mm ? `${component.width_mm} mm` : '—'}</td>
                                </tr>
                                <tr>
                                    <td>height</td>
                                    <td>{component.height_mm ? `${component.height_mm} mm` : '—'}</td>
                                </tr>
                                <tr>
                                    <td>returns</td>
                                    <td>{component.returns_mm ? `${component.returns_mm} mm` : 'n/a'}</td>
                                </tr>
                                <tr>
                                    <td>material</td>
                                    <td>{component.material || '—'}</td>
                                </tr>
                                {component.lighting && (
                                    <tr>
                                        <td>lighting</td>
                                        <td>{getLightingTypeLabel(component.lighting)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Confirmations */}
                    <div className="section-title">confirmations</div>
                    <div className="confirmation-item">
                        <span className="checkbox-filled">{component.scale_confirmed ? '×' : ''}</span>
                        <span>scale is 1:1 — confirmed</span>
                    </div>
                    <div className="confirmation-item">
                        <span className="checkbox-filled">{component.bleed_included ? '×' : ''}</span>
                        <span>bleed included in artwork</span>
                    </div>

                    {/* File Path */}
                    <div className="section-title">file reference</div>
                    <div className="file-path">
                        {component.file_path || '—'}
                    </div>

                    {/* Notes */}
                    {component.notes && (
                        <>
                            <div className="section-title">design notes</div>
                            <div className="design-notes">{component.notes}</div>
                        </>
                    )}

                    {/* Signature Block */}
                    <div className="signature-block">
                        <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: '1mm' }}>
                            designer sign-off
                        </div>
                        <div className="signature-line">
                            <span>name:</span>
                            <span className="line" />
                        </div>
                        <div className="signature-line">
                            <span>signature:</span>
                            <span className="line" />
                        </div>
                        <div className="signature-line">
                            <span>date:</span>
                            <span className="line" />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Production Checklist (40%) */}
                <div className="production-checklist">
                    <div className="sheet-header">
                        <h1>production verification</h1>
                        <h2>{job.job_name}</h2>
                    </div>

                    {/* Measured Dimensions */}
                    <div className="section-title">measured dimensions</div>
                    {hasExtraItems && (
                        <div style={{ fontSize: '8px', fontWeight: 700, marginBottom: '1mm' }}>item A</div>
                    )}
                    <div className="measurement-row">
                        <span>width:</span>
                        <span className="measurement-field" />
                        <span>mm</span>
                    </div>
                    <div className="measurement-row">
                        <span>height:</span>
                        <span className="measurement-field" />
                        <span>mm</span>
                    </div>
                    {extraItems.map(item => (
                        <div key={item.id}>
                            <div style={{ fontSize: '8px', fontWeight: 700, marginTop: '2mm', marginBottom: '1mm' }}>
                                item {item.label}
                            </div>
                            <div className="measurement-row">
                                <span>width:</span>
                                <span className="measurement-field" />
                                <span>mm</span>
                            </div>
                            <div className="measurement-row">
                                <span>height:</span>
                                <span className="measurement-field" />
                                <span>mm</span>
                            </div>
                        </div>
                    ))}

                    {/* Checklist */}
                    <div className="section-title">checklist</div>
                    <div className="checkbox-line">
                        <span className="checkbox-empty" />
                        <span>material pulled and confirmed correct</span>
                    </div>
                    <div className="checkbox-line">
                        <span className="checkbox-empty" />
                        <span>RIP output checked — no scaling applied</span>
                    </div>
                    <div className="checkbox-line">
                        <span className="checkbox-empty" />
                        <span>print quality acceptable</span>
                    </div>
                    <div className="checkbox-line">
                        <span className="checkbox-empty" />
                        <span>colour match verified</span>
                    </div>
                    <div className="checkbox-line">
                        <span className="checkbox-empty" />
                        <span>finish / lamination correct</span>
                    </div>

                    {/* Dimension Check */}
                    <div className="dimension-check-section">
                        <div className="title">dimension check (office use)</div>
                        {hasExtraItems && (
                            <div style={{ fontSize: '7px', fontWeight: 700, marginBottom: '0.5mm' }}>item A</div>
                        )}
                        <div className="measurement-row">
                            <span>width dev:</span>
                            <span className="measurement-field" style={{ width: '15mm' }} />
                            <span>mm</span>
                        </div>
                        <div className="measurement-row">
                            <span>height dev:</span>
                            <span className="measurement-field" style={{ width: '15mm' }} />
                            <span>mm</span>
                        </div>
                        {extraItems.map(item => (
                            <div key={item.id}>
                                <div style={{ fontSize: '7px', fontWeight: 700, marginTop: '1mm', marginBottom: '0.5mm' }}>item {item.label}</div>
                                <div className="measurement-row">
                                    <span>width dev:</span>
                                    <span className="measurement-field" style={{ width: '15mm' }} />
                                    <span>mm</span>
                                </div>
                                <div className="measurement-row">
                                    <span>height dev:</span>
                                    <span className="measurement-field" style={{ width: '15mm' }} />
                                    <span>mm</span>
                                </div>
                            </div>
                        ))}
                        <div className="checkbox-line" style={{ marginTop: '1mm' }}>
                            <span className="checkbox-empty" />
                            <span>within tolerance (+/- {DIMENSION_TOLERANCE_MM}mm)</span>
                        </div>
                        <div className="checkbox-line">
                            <span className="checkbox-empty" />
                            <span style={{ fontWeight: 600 }}>OUT OF TOLERANCE — escalate</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="notes-area">
                        <div className="section-title">notes</div>
                        <div className="notes-lines" />
                        <div className="notes-lines" />
                        <div className="notes-lines" />
                    </div>

                    {/* Signature Block */}
                    <div className="signature-block">
                        <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: '1mm' }}>
                            production sign-off
                        </div>
                        <div className="signature-line">
                            <span>name:</span>
                            <span className="line" />
                        </div>
                        <div className="signature-line">
                            <span>signature:</span>
                            <span className="line" />
                        </div>
                        <div className="signature-line">
                            <span>date:</span>
                            <span className="line" />
                        </div>
                    </div>
                </div>
                </div>

                {/* Footer — inside the sheet so it doesn't spill to a second page */}
                <div className="footer-meta">
                    {job.job_reference} — {component.name} — v{versionNumber} — printed {formatDate(new Date().toISOString())} — onesign artwork compliance system
                </div>
            </div>
        </>
    );
}
