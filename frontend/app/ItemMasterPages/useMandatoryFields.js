/**
 * useMandatoryFields.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable hook — fetches mandatory field keys for any page + company + plant.
 *
 * Same API endpoint already used in ItemCodeCreationReq.js:
 *   GET /mandatory-fields/resolve/effective
 *       ?page_key=<key>&company_id=<id>&plant_id=<id>
 *
 * Usage:
 *   const { mandatoryKeys, loading } = useMandatoryFields({
 *     pageKey:   'item-info-master',   // matches page_key in mandatory_field_config table
 *     companyId: mappingRecord?.company_id,
 *     plantId:   mappingRecord?.plant_id,   // optional
 *   });
 *
 *   // Then check: mandatoryKeys.includes('base_uom')
 *
 * Zero changes to any existing file.
 */

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

/**
 * @param {object} opts
 * @param {string}      opts.pageKey    - page_key stored in mandatory_field_config (e.g. "item-info-master")
 * @param {number|null} opts.companyId  - company_id from the request record
 * @param {number|null} [opts.plantId]  - plant_id from the request record (optional)
 * @returns {{ mandatoryKeys: string[], loading: boolean }}
 */
const useMandatoryFields = ({ pageKey, companyId, plantId = null }) => {
  const [mandatoryKeys, setMandatoryKeys] = useState([]);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    // Nothing to fetch if no company selected yet
    if (!pageKey || !companyId) {
      setMandatoryKeys([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      page_key:   pageKey,
      company_id: String(companyId),
    });
    if (plantId) params.set('plant_id', String(plantId));

    fetch(`${API_BASE}/mandatory-fields/resolve/effective?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled) return;
        setMandatoryKeys(d?.mandatory_keys ?? []);
      })
      .catch(() => { if (!cancelled) setMandatoryKeys([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [pageKey, companyId, plantId]);

  return { mandatoryKeys, loading };
};

export default useMandatoryFields;