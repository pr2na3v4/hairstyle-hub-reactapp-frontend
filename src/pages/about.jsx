import React from 'react'
import './about.css'
export const about = () => {
  return (
    <>
      
      <main>

    <header className="about-header">
        <h1>Welcome to **HairStyleHub**</h1>
        <p>More than just a gallery—we are the definitive digital destination for anyone looking to discover, define,
            and perfect their next look, blending curated content with cutting-edge technology.</p>
    </header>

    <section className="phase-section">
        <h2 style={{textAlign: "center", marginBottom: "40px", color: "var(--color-primary)"}}>Our Roadmap: Building the
            Future of Style</h2>

        <div className="phase-grid">
            <article className="phase-card">
                <h2><i className="icon fa-solid fa-flag-checkered"></i> PHASE 1: The Foundation (Ready)</h2>

                <h3>Core Offerings</h3>
                <ul>
                    <li><span className="icon fa-solid fa-paintbrush"></span> Design a **premium UI** (Mobile-first
                        approach).</li>
                    <li><span className="icon fa-solid fa-folder-open"></span> Add a **curated haircut dataset** manually.
                    </li>
                </ul>

                <h3>Haircut Card Details</h3>
                <ul>
                    <li><span className="icon fa-solid fa-image"></span> Image, Name, and Category display.</li>
                </ul>

                <h3>Basic Features</h3>
                <ul>
                    <li><span className="icon fa-solid fa-search"></span> Browse haircuts with Categories & Filters.</li>
                    <li><span className="icon fa-solid fa-heart"></span> **Save favorites** feature for user
                        personalization.</li>
                </ul>
            </article>

            <article className="phase-card">
                <h2><i className="icon fa-solid fa-brain"></i> PHASE 2: Update 1 (AI Personalization)</h2>

                <h3>🔍 New Feature: Face Scanner</h3>
                <p>A major upgrade introducing **AI-based personalization** to enhance user engagement.</p>

                <h3>How it Works</h3>
                <ul>
                    <li><span className="icon fa-solid fa-camera"></span> User uploads/scans face for analysis.</li>
                    <li><span className="icon fa-solid fa-circle-notch"></span> System **detects face shape** (e.g., oval,
                        square).</li>
                    <li><span className="icon fa-solid fa-lightbulb"></span> Haircuts are suggested based on face shape &
                        preferences.</li>
                </ul>

                <h3>Key Benefits</h3>
                <ul>
                    <li><span className="icon fa-solid fa-check"></span> Increased **Personalization**.</li>
                    <li><span className="icon fa-solid fa-check"></span> Higher App Value & Uniqueness.</li>
                </ul>
            </article>

            <article className="phase-card">
                <h2><i className="icon fa-solid fa-scissors"></i> PHASE 3: Update 2 (Creator System)</h2>

                <h3>✂️ Barber & Salon Creator Feature</h3>
                <p>Transforming the platform into a community and marketplace for grooming professionals.</p>

                <h3>Barber Shop Capabilities</h3>
                <ul>
                    <li><span className="icon fa-solid fa-user-plus"></span> Create professional accounts.</li>
                    <li><span className="icon fa-solid fa-upload"></span> Upload and showcase their haircut posts.</li>
                    <li><span className="icon fa-solid fa-bullhorn"></span> Promote their salon and reach customers
                        directly.</li>
                </ul>

                <h3>Long-Term Scalability</h3>
                <ul>
                    <li><span className="icon fa-solid fa-check"></span> **Content grows automatically**.</li>
                    <li><span className="icon fa-solid fa-check"></span> Platform becomes a marketplace/community.</li>
                </ul>
            </article>

        </div>
    </section>

    <section className="vision-section">
        <h2>🔥 Our Long-Term Vision</h2>
        <p>This is not just a haircut gallery. We are building the central grooming hub.</p>

        <div className="vision-list">
            <div className="vision-item">A Grooming Discovery Platform</div>
            <div className="vision-item">A Barber Marketing Tool</div>
            <div className="vision-item">A Style Recommendation System</div>
        </div>
    </section>

</main>
    </>
  )
}
export default about