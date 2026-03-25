import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './card.css';
import Loader from './Loader';

// ─── Configuration ────────────────────────────────────────────────────────────
// NOTE: VITE_API_BASE_URL must include /api (e.g. https://your-api.com/api).
//       The fallback already does — keep them consistent.
const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'https://hairstyle-hub-backend.onrender.com/api';

const DESC_MAX_LENGTH = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX #5: Centralised ID extraction — handles MongoDB $oid objects and plain strings
const extractId = (id) => id?.$oid ?? id;

// FIX #1 + #9: Only appends "…" when the text actually exceeds the limit.
//              Also handles empty-string descriptions correctly.
const truncate = (text, max) =>
    text && text.length > max ? `${text.substring(0, max)}…` : text;

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ id, name, imageUrl, description }) => (
    <div className="card-container animate-up">
        <div className="card-image-box">
            <img src={imageUrl} alt={name} loading="lazy" />
        </div>

        <div className="card-info">
            <h3>{name}</h3>

            {/* FIX #9: truthy check on truncated result handles "" gracefully */}
            {truncate(description, DESC_MAX_LENGTH) && (
                <p className="card-desc">{truncate(description, DESC_MAX_LENGTH)}</p>
            )}

            {/* FIX #10: aria-label includes the haircut name so screen readers
                         can distinguish "View Details — Fade Cut" from other cards */}
            <Link
                to={`/haircut/${id}`}
                className="view-details-btn"
                aria-label={`View details for ${name}`}
            >
                View Details
                <i className="ri-arrow-right-line" aria-hidden="true" />
            </Link>
        </div>
    </div>
);

// ─── Cards (Trending Grid) ────────────────────────────────────────────────────
// FIX #6 (comment): Fetches all haircuts then filters client-side.
//                   If the API adds ?isTrending=true support, move the filter server-side.
export const Cards = ({ limit }) => {
    const [haircuts, setHaircuts] = useState([]);
    const [loading, setLoading]   = useState(true);
    // FIX #3: Expose fetch errors so the user sees feedback instead of a silent empty grid
    const [error, setError]       = useState(null);

    useEffect(() => {
        // FIX #11: Extracted so the async function is named and easy to follow
        const fetchTrending = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${BASE_URL}/haircuts`);

                // FIX #2: Throw on non-2xx so the catch block handles HTTP errors too
                if (!res.ok) throw new Error(`Server error ${res.status}`);

                const data = await res.json();

                // FIX #4: Apply limit inside this callback — the effect only re-runs
                //         when `limit` actually changes, which is correct and intentional
                const trending = data
                    .filter((item) => item.isTrending === true)
                    .slice(0, limit ?? data.length); // slice(0, undefined) returns the full array

                setHaircuts(trending);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Could not load trending styles. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
    }, [limit]);

    // FIX #7: Use the shared Loader component for visual consistency
    if (loading) return <Loader />;

    // FIX #3: Render the error message when the fetch failed
    if (error) return <p className="empty-state" role="alert">{error}</p>;

    return (
        <div className="cards-grid">
            {haircuts.length > 0 ? (
                haircuts.map((item) => {
                    const haircutId = extractId(item._id); // FIX #5
                    return (
                        <Card
                            key={haircutId}
                            id={haircutId}
                            imageUrl={item.imageUrl}
                            name={item.name}
                            description={item.style || item.description}
                        />
                    );
                })
            ) : (
                // FIX #8: role="status" lets screen readers announce the empty state
                <p className="empty-state" role="status">
                    No trending styles found.
                </p>
            )}
        </div>
    );
};