import cds from '@sap/cds';

// pt-BR texts and colours of the applications' execution status
const STATUS = {
    RUNNING: { text: 'Em execução', color: '#0a6ed1' },
    SUCCESS: { text: 'Sucesso', color: '#107e3e' },
    WARNING: { text: 'Aviso', color: '#e9730c' },
    ERROR: { text: 'Erro', color: '#bb0000' }
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Payload content is external input, so every value is escaped before it reaches the HTML body
const escape = vValue => String(vValue).replace(/[&<>"']/g, sChar => ESCAPES[sChar]);

// The server runs in UTC and the readers do not, so the timestamps are rendered in the configured timezone
const formatTimestamp = vTimestamp => {
    const dDate = new Date(vTimestamp);
    if (isNaN(dDate)) return '';
    const mParts = new Map(new Intl.DateTimeFormat('pt-BR', {
        timeZone: cds.env.notifications?.timezone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(dDate).map(oPart => [oPart.type, oPart.value]));
    return `${mParts.get('day')}/${mParts.get('month')}/${mParts.get('year')} ${mParts.get('hour')}:${mParts.get('minute')}`;
};

const NO_PAYLOAD = 'Esta execução não possui payload.';

// The payload is a JSON string whose keys are declared per integration in IntegrationFields,
// so configured keys are shown with their label and anything else with the key itself.
const payloadBlocks = (sPayload, aFields) => {
    if (!sPayload || !String(sPayload).trim()) return { empty: NO_PAYLOAD };

    let vPayload;
    try {
        vPayload = JSON.parse(sPayload);
    } catch {
        return { raw: sPayload };
    }

    const mLabels = new Map((aFields ?? []).map(oField => [oField.fieldName, oField.label]));
    const entriesOf = vElement => {
        if (vElement === null || typeof vElement !== 'object') return [['Valor', vElement]];
        return Object.entries(vElement).map(([sKey, vValue]) => [
            mLabels.get(sKey) ?? sKey,
            vValue !== null && typeof vValue === 'object' ? JSON.stringify(vValue) : vValue
        ]);
    };

    const aElements = Array.isArray(vPayload) ? vPayload : [vPayload];
    const aBlocks = aElements.map(entriesOf).filter(aEntries => aEntries.length > 0);
    return aBlocks.length > 0 ? { blocks: aBlocks } : { empty: NO_PAYLOAD };
};

export const render = ({ log, integration, fields }) => {
    const oStatus = STATUS[log.status] ?? { text: log.status ?? '', color: '#6a6d70' };
    const sExecutedAt = formatTimestamp(log.executedAt);
    const aDetails = [
        ['Integração', integration?.description ?? ''],
        ['Origem → Destino', `${integration?.source ?? ''} → ${integration?.target ?? ''}`],
        ['Execução', sExecutedAt],
        ['ID do log', log.ID ?? '']
    ];

    const sDetailRows = aDetails.map(([sLabel, sValue]) => `
                            <tr>
                                <td style="padding: 6px 12px 6px 0; color: #6a6d70; font-size: 13px; white-space: nowrap; vertical-align: top;">${escape(sLabel)}</td>
                                <td style="padding: 6px 0; color: #32363a; font-size: 13px; vertical-align: top;">${escape(sValue)}</td>
                            </tr>`).join('');

    const oPayload = payloadBlocks(log.payload, fields);
    const sPayloadHtml = oPayload.empty
        ? `<p style="margin: 0; color: #6a6d70; font-size: 13px;">${escape(oPayload.empty)}</p>`
        : oPayload.raw
            ? `<pre style="margin: 0; padding: 12px; background-color: #f5f6f7; border: 1px solid #e5e5e5; border-radius: 4px; color: #32363a; font-size: 12px; white-space: pre-wrap; word-break: break-word;">${escape(oPayload.raw)}</pre>`
            : oPayload.blocks.map(aEntries => `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0 0 12px 0; background-color: #f5f6f7; border: 1px solid #e5e5e5; border-radius: 4px;">${aEntries.map(([sLabel, vValue]) => `
                                <tr>
                                    <td style="padding: 6px 12px; color: #6a6d70; font-size: 13px; white-space: nowrap; vertical-align: top;">${escape(sLabel)}</td>
                                    <td style="padding: 6px 12px; color: #32363a; font-size: 13px; vertical-align: top; word-break: break-word;">${escape(vValue ?? '')}</td>
                                </tr>`).join('')}
                            </table>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background-color: #f5f6f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f6f7; padding: 24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 100%; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; font-family: Arial, Helvetica, sans-serif;">
                    <tr>
                        <td style="background-color: ${oStatus.color}; border-radius: 8px 8px 0 0; padding: 16px 24px; color: #ffffff; font-size: 18px; font-weight: bold;">${escape(oStatus.text)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 24px;">
                            <p style="margin: 0 0 16px 0; color: #32363a; font-size: 15px;">Uma execução da integração <strong>${escape(integration?.description ?? '')}</strong> terminou com o status <strong>${escape(oStatus.text)}</strong>.</p>
                            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">${sDetailRows}
                            </table>
                            <p style="margin: 24px 0 8px 0; color: #32363a; font-size: 14px; font-weight: bold;">Payload</p>
                            ${sPayloadHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 24px; border-top: 1px solid #e5e5e5; color: #6a6d70; font-size: 12px;">Log Monitor</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const aPayloadText = oPayload.empty
        ? [oPayload.empty]
        : oPayload.raw
            ? [oPayload.raw]
            : oPayload.blocks.flatMap((aEntries, iIndex) => [
                ...(oPayload.blocks.length > 1 ? [`- item ${iIndex + 1}`] : []),
                ...aEntries.map(([sLabel, vValue]) => `${sLabel}: ${vValue ?? ''}`)
            ]);

    const text = [
        `${oStatus.text} - ${integration?.description ?? ''}`,
        '',
        ...aDetails.map(([sLabel, sValue]) => `${sLabel}: ${sValue}`),
        '',
        'Payload',
        ...aPayloadText
    ].join('\n');

    return {
        subject: `[${oStatus.text}] ${integration?.description ?? ''} - ${sExecutedAt}`,
        html,
        text
    };
};
