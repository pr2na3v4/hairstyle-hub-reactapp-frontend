import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import Hook
import './card.css';
import Loader from './Loader';

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'https://hairstyle-hub-backend.onrender.com/api';

const DESC_MAX_LENGTH = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const extractId = (id) => id?.$oid ?? id;

const truncate = (text, max) =>
    text && text.length > max ? `${text.substring(0, max)}…` : text;

// ─── Individual Card (Stateless) ──────────────────────────────────────────────
export const Card = ({ id, name, imageUrl, description }) => (
    <div className="card-container animate-up">
        <div className="card-image-box">
            <img src={imageUrl} alt={name} loading="lazy" />
        </div>

        <div className="card-info">
            <h3>{name}</h3>
            {truncate(description, DESC_MAX_LENGTH) && (
                <p className="card-desc">{truncate(description, DESC_MAX_LENGTH)}</p>
            )}
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

// ─── Cards Grid (Data Logic with TanStack Query) ──────────────────────────────
export const Cards = ({ limit }) => {
    
    // TanStack Query Implementation
    const { data: haircuts = [], isLoading, isError, error } = useQuery({
        queryKey: ['haircuts', 'trending', limit], // Unique key for caching
        queryFn: async () => {
            const res = await fetch(`${BASE_URL}/haircuts`);
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            
            const data = await res.json();
            
            // Filter and Slice logic moved inside the fetcher for cleaner rendering
            return data
                .filter((item) => item.isTrending === true)
                .slice(0, limit ?? data.length);
        },
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
    });

    // Handle Loading State
    if (isLoading) return <Loader />;

    // Handle Error State
    if (isError) {
        return (
            <p className="empty-state" role="alert">
                {error.message || 'Could not load trending styles. Please try again later.'}
            </p>
        );
    }

    return (
        <div className="cards-grid">
            {haircuts.length > 0 ? (
                haircuts.map((item) => {
                    const haircutId = extractId(item._id);
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
                <p className="empty-state" role="status">
                    No trending styles found.
                </p>
            )}
        </div>
    );
};