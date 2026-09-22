# Skarlet Araque — Portfolio

![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

> Product Tech Lead · Senior Frontend Developer

Personal portfolio showcasing my experience, technical expertise, and selected projects focused on building scalable, accessible, and user-centered digital products.

## 🚀 About the project

This repository contains my personal portfolio, designed to showcase:

* Professional experience and technical leadership
* Frontend architecture and development expertise
* Product-oriented thinking and problem solving
* Selected technical projects and case studies
* Experiments and projects built with modern web technologies

The portfolio is being developed as a living project, continuously evolving alongside my professional and technical growth.

Architecture and coding conventions for this repository — including how the portfolio and Finora are kept as separate boundaries — are documented in [`CLAUDE.md`](CLAUDE.md).

## 🧩 Featured project

### Finora

**Finora** is a personal expense management application focused on helping users understand, organize, and manage their finances through a simple and intuitive experience. It's embedded in this repository as an independent application, live at `/finora`, and doubles as a case study for this portfolio.

For the full technical write-up — architecture, features, tech stack, ADRs, and how to run it locally — see **[Finora's own README](src/apps/finora/README.md)**. Finora also has its own Storybook component library and design-system overview (`npm run storybook`).

The project serves as a practical demonstration of:

* React application architecture
* State management
* Responsive UI development
* Data visualization
* Form handling and validation
* API integration
* UX/UI principles
* Scalable frontend patterns

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* TypeScript
* HTML5
* CSS3

### Development

* Git
* GitHub
* oxlint
* VS Code / Cursor
* WSL

### Deployment

* Vercel

## 📁 Project Structure

```text
portafolio/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── atoms/
│   │   └── molecules/
│   ├── data/
│   │   └── profile.ts
│   ├── sections/
│   ├── pages/
│   ├── projects/
│   │   └── finora/
│   │       └── meta.ts
│   ├── apps/
│   │   └── finora/          # Finora — see its own README
│   ├── App.tsx
│   ├── AppRouter.tsx
│   └── main.tsx
├── docs/
│   └── adr/
├── .storybook/
├── CLAUDE.md
├── LICENSE
├── package.json
├── vite.config.js
└── README.md
```

## 🎯 Goals

The main goals of this project are to:

1. Build a professional personal portfolio.
2. Showcase my experience as a Product Tech Lead and Senior Frontend Developer.
3. Demonstrate modern frontend architecture and development practices.
4. Present real projects through technical and product-oriented case studies.
5. Experiment with new technologies and development approaches.
6. Maintain the portfolio as a living, continuously evolving project.

## 📌 Roadmap

* [x] Initialize project
* [x] Define visual identity and design system
* [x] Build portfolio landing page
* [x] Add professional experience
* [x] Add technical skills
* [x] Add projects and case studies
* [x] Build Finora
* [x] Add responsive design
* [x] Add accessibility improvements
* [ ] Configure SEO and metadata (Open Graph tags, sitemap)
* [x] Deploy to Vercel
* [ ] Configure custom domain

## 🌐 Deployment

Deployed on Vercel: **[portafolio-skarlet-a.vercel.app](https://portafolio-skarlet-a.vercel.app/)**

The portfolio lives at the root; Finora is client-side routed at `/finora` on the same deployment.

## 📄 License

All rights reserved — see [`LICENSE`](LICENSE). This is proprietary, source-available portfolio code, not open-source.

## 📬 Contact

For professional opportunities, collaborations, or technical discussions, feel free to connect with me through my professional profiles.

---

Built with React, Vite and Tailwind CSS.
