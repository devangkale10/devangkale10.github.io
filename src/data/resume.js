/*
 * Every fact on the site comes from this file, and every fact in this file
 * comes from Devang Kale's resume (v13). Edit here to update the site.
 *
 * Text inside **double asterisks** is rendered as a highlighted figure.
 */

export const profile = {
  name: 'Devang Kale',
  role: 'Data Scientist',
  email: 'devang.r.kale@gmail.com',
  phone: '+91 9503321445',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/devang-kale/', handle: 'in/devang-kale' },
    { label: 'GitHub', href: 'https://github.com/devangkale10', handle: 'devangkale10' },
    {
      label: 'Tableau Public',
      href: 'https://public.tableau.com/app/profile/devang.kale8055/vizzes',
      handle: 'devang.kale8055'
    }
  ],
  summary:
    'Data Scientist with 4+ years of experience across every layer of the data stack in finance, healthcare, and higher education.',
  summaryDetail:
    "I've engineered the Python/Snowflake pipelines to move data, built the artifacts to explain data, and developed the RAG/LLM applications to act on data.",
  current: {
    title: 'Data Analyst II',
    org: 'University of Florida',
    unit: 'Office of Assessment and Research'
  },
  // Optional: drop a PDF into /public and set e.g. '/Devang-Kale-Resume.pdf' to show a résumé button.
  resumeUrl: ''
};

/*
 * The three layers from the summary: pipelines to move data, artifacts to explain data,
 * models to act on data. Each layer has one card: its skills (all named on the resume) on the front,
 * and on the back a few places they were used, written plainly.
 */
export const layers = [
  {
    id: 'move',
    index: '01',
    name: 'Move',
    phrase: 'pipelines to move data',
    headline: 'Pipelines to move data',
    body: "Most of my work starts with data that doesn't want to cooperate. I write the jobs that pull it together, clean it up and check that it landed right, so the people downstream can trust what they see without having to ask.",
    skills: [
      {
        group: 'Data & Engineering',
        items: ['Python', 'SQL', 'pandas', 'PySpark', 'Snowflake', 'AWS Redshift', 'PostgreSQL', 'MongoDB', 'Airflow', 'Docker', 'Kubernetes', 'CI/CD', 'AWS (Lambda, S3, EC2)'],
        practice: [
          { text: 'Pulled 10+ campus data sources into one clean, deduplicated feed', where: 'University of Florida' },
          { text: 'Kept 1M+ records a day flowing into finance reporting', where: 'Infosys' },
          { text: 'Rewrote the SQL behind a daily extract and took it from ~20 minutes to ~10', where: 'Infosys' },
          { text: 'Scheduled pipelines in Airflow that retry on their own when something breaks', where: 'Infosys' }
        ]
      }
    ]
  },
  {
    id: 'explain',
    index: '02',
    name: 'Explain',
    phrase: 'artifacts to explain data',
    headline: 'Artifacts to explain data',
    body: "Numbers only matter once someone can act on them. I build the dashboards and reports people actually open, run experiments properly, and dig into why a model said what it said, down to a single patient's prediction.",
    skills: [
      {
        group: 'Statistics & Visualization',
        items: ['A/B Testing', 'Hypothesis Testing', 'Power Analysis', 'Regression', 'SciPy', 'statsmodels', 'Power BI', 'Tableau', 'Streamlit', 'Plotly', 'Matplotlib', 'Geospatial Analysis (GeoPandas)'],
        practice: [
          { text: 'Built the A/B testing setup behind ~10 email experiments', where: 'Changing The Present' },
          { text: 'The winning versions lifted donor conversion by 15%', where: 'Changing The Present' },
          { text: 'A food pantry dashboard that sends its own weekly report and speaks up when a run fails', where: 'University of Florida' },
          { text: 'Mapped where a 50K+ student population lives across 16 colleges', where: 'University of Florida' }
        ]
      }
    ]
  },
  {
    id: 'act',
    index: '03',
    name: 'Act',
    phrase: 'models to act on data',
    headline: 'Models to act on data',
    body: 'This is the fun part. I build LLM tools and ML models that do real work, like finding the right dataset, sorting incoming requests or flagging risk, and I measure them properly before I trust them.',
    skills: [
      {
        group: 'GenAI & Machine Learning',
        items: ['RAG (hybrid search, reranking)', 'LangGraph', 'LangChain', 'ChromaDB', 'OpenAI API', 'LiteLLM', 'LLM Evaluation', 'Hugging Face', 'PyTorch', 'scikit-learn', 'XGBoost', 'Explainable AI (SHAP, LIME)', 'MLflow'],
        practice: [
          { text: 'A search assistant for staff that now finds the right dataset far more often: 60% to 85%', where: 'University of Florida' },
          { text: 'Taught GPT-5 to route student concerns, agreeing with people 90% of the time', where: 'University of Florida' },
          { text: 'Gave ~200 Snowflake views plain-English definitions with GPT-5', where: 'University of Florida' },
          { text: 'Walked clinicians through why the model flagged each patient', where: 'PRISMAP Labs' }
        ]
      }
    ]
  }
];

export const layerById = Object.fromEntries(layers.map(l => [l.id, l]));

/* Headline results. `from` is the before value where the resume gives one;
   the counter animates from it, so the motion shows the real change. */
export const outcomes = [
  {
    layer: 'act',
    value: 85,
    from: 60,
    suffix: '%',
    label: 'Recall@5',
    delta: 'up from 60%',
    context: 'RAG data assistant with hybrid search and reranking',
    org: 'University of Florida'
  },
  {
    layer: 'act',
    value: 90,
    from: 0,
    suffix: '%',
    label: 'Agreement with human labels',
    context: 'GPT-5 multilabel classifier routing 16K+ Reddit posts a year to 15 Student Life units',
    org: 'University of Florida'
  },
  {
    layer: 'act',
    value: 250,
    from: 0,
    unit: 'hrs',
    label: 'Manual work saved',
    context: 'GPT-5 data dictionary for ~200 Snowflake views and 20K+ columns',
    org: 'University of Florida'
  },
  {
    layer: 'move',
    value: 350,
    from: 0,
    unit: 'hrs/yr',
    label: 'Staff hours saved per year',
    context: 'Snowflake/Python ETL integrating 10+ data sources for a food pantry dashboard',
    org: 'University of Florida'
  },
  {
    layer: 'explain',
    value: 15,
    from: 0,
    prefix: '+',
    suffix: '%',
    label: 'Donor conversion',
    context: 'Winning variants from ~10 email A/B experiments',
    org: 'Changing The Present'
  },
  {
    layer: 'move',
    value: 1,
    from: 5,
    suffix: '%',
    label: 'Reconciliation mismatch rate',
    delta: 'down from 5%',
    context: 'ETL pipelines processing 1M+ financial records daily',
    org: 'Infosys'
  }
];

/* Each bullet is the resume's own text; `skills` is a short note of the tools named in it. */
export const experience = [
  {
    id: 'uf',
    title: 'Data Analyst II',
    org: 'University of Florida',
    unit: 'Office of Assessment and Research',
    // the office is the employer here, so the whole name is the link
    linkUnit: true,
    url: 'https://assessment.ufsa.ufl.edu/who-we-are/meet-the-team/',
    location: 'Gainesville, FL',
    start: 'Nov 2024',
    end: 'Present',
    bullets: [
      {
        skills: ['RAG', 'LangChain', 'ChromaDB'],
        text: 'Developed and deployed a RAG data assistant to help staff discover institutional datasets and define data requests, using Python, LangChain, and ChromaDB with hybrid search and reranking to improve **Recall@5 from 60% to 85%**.'
      },
      {
        skills: ['GPT-5', 'LiteLLM', 'Snowflake MCP'],
        text: 'Built a GPT-5 data dictionary tool for RAG applications using LiteLLM for model routing and Snowflake MCP for metadata retrieval, generating grounded definitions for **~200 Snowflake views (20K+ columns)** and **saving 250 hours** of manual work.'
      },
      {
        skills: ['GPT-5', 'Few-shot prompting', 'Snowflake'],
        text: 'Designed a GPT-5 multilabel classifier (Python, Snowflake) to route high-priority student concerns from **16K+ Reddit posts/year** to **15 Student Life units**, achieving **90% agreement** with human-labeled data using few-shot prompting.'
      },
      {
        skills: ['Snowflake', 'Python', 'DuckDB SQL'],
        text: 'Engineered Snowflake/Python ETL pipelines integrating **10+ data sources** for a university food pantry dashboard, using DuckDB SQL for deduplication and automating weekly reports with failure alerts, **saving 350 staff hours/year**.'
      },
      {
        skills: ['GeoPandas', 'Haversine distances'],
        text: 'Conducted geospatial analysis using GeoPandas, Haversine distances, and participation rates to assess Gator Esports Center engagement across a **50K+ student population** and **16 colleges**, identifying proximity trends and outreach targets.'
      }
    ]
  },
  {
    id: 'ctp',
    title: 'Data Scientist Intern',
    org: 'Changing The Present',
    url: 'https://changingthepresent.org/',
    location: 'Atlanta, GA',
    start: 'Aug 2024',
    end: 'Nov 2024',
    bullets: [
      {
        skills: ['A/B testing', 'SciPy', 'statsmodels'],
        text: 'Developed a Python A/B testing framework (SciPy, statsmodels) that handled sample-size planning, significance testing, and automated reporting for **~10 email experiments**. Winning variants raised **donor conversion by 15%**.'
      },
      {
        skills: ['Python', 'Selenium', 'Google Sheets'],
        text: 'Automated influencer prospecting with a Python/Selenium web scraper, collecting public contact emails from **10K+ social media creator profiles** and exporting cleaned leads to Google Sheets. Reduced manual research time by **40%**.'
      }
    ]
  },
  {
    id: 'prismap',
    title: 'AI/ML Research Assistant',
    org: 'PRISMAP Labs',
    unit: 'University of Florida',
    url: 'https://ic3.center.ufl.edu/research/ic3-research-labs/',
    location: 'Gainesville, FL',
    start: 'May 2023',
    end: 'Aug 2023',
    bullets: [
      {
        skills: ['XGBoost', 'Random forest', 'MLflow'],
        text: 'Benchmarked logistic regression, random forest, and XGBoost across **30 model configurations**, using MLflow to track experiments, compare validation results, and guide model selection for postoperative complication prediction.'
      },
      {
        skills: ['SHAP', 'LIME', 'Partial dependence plots'],
        text: 'Applied Explainable AI techniques (SHAP, LIME, and partial dependence plots) to interpret individual patient risk predictions and overall model patterns. Reviewed the findings with clinicians to assess clinical plausibility.'
      }
    ]
  },
  {
    id: 'infosys',
    title: 'Systems & Data Engineer',
    org: 'Infosys',
    url: 'https://www.infosys.com/',
    location: 'Pune, India',
    start: 'Nov 2020',
    end: 'Jul 2022',
    bullets: [
      {
        skills: ['Python', 'pandas', 'SAP HANA'],
        text: 'Developed Python/pandas and SAP HANA ETL pipelines for financial reporting, processing **1M+ records daily** and implementing automated source-to-target reconciliation checks that reduced mismatch rates **from 5% to 1%**.'
      },
      {
        skills: ['SQL', 'CTEs', 'Window functions'],
        text: 'Optimized SQL queries for financial reporting using execution plans, CTEs, window functions, and partitioned joins, reducing daily extract runtime **from ~20 minutes to ~10 minutes**.'
      },
      {
        skills: ['Apache Airflow', 'DAGs'],
        text: 'Implemented Apache Airflow DAGs to orchestrate scheduled ETL workflows, configure task dependencies and retries, and monitor pipeline execution for financial reporting.'
      },
      {
        skills: ['Data models', 'Analytical queries', 'Dashboards'],
        text: 'Partnered with business and technology stakeholders to translate reporting requirements into data models, analytical queries, and dashboards, supporting initiatives tied to **$5M in annual client revenue growth**.'
      }
    ]
  }
];

export const projects = [
  {
    id: 'pii',
    title: 'PII Detection & Redaction System',
    stack: ['Python', 'spaCy', 'Hugging Face', 'pandas', 'pytest'],
    url: 'https://github.com/devangkale10/PII-Redaction-System',
    text: 'Implemented a PII redaction system combining spaCy NER, Hugging Face Transformers, and regex pattern matching, achieving **90% detection accuracy** on sensitive fields.',
    metric: { value: 90, suffix: '%', label: 'Detection accuracy' }
  },
  {
    id: 'recs',
    title: 'Product Recommendation System',
    stack: ['Python', 'scikit-learn', 'TensorFlow/Keras'],
    url: 'https://github.com/devangkale10/Product-Recommendation-using-NLP-and-CNN',
    text: 'Developed a product recommendation system for **16K+ Amazon apparel products** using TF-IDF and Word2Vec for product-title similarity and pretrained VGG16 CNN features for visual similarity, achieving **80% Precision@10**.',
    metric: { value: 80, suffix: '%', label: 'Precision@10' }
  }
];

export const education = [
  {
    degree: 'Master of Science in Computer Science',
    school: 'University of Florida',
    place: 'USA',
    gpa: '3.7',
    scale: '4',
    start: 'Aug 2022',
    end: 'May 2024'
  },
  {
    degree: 'Bachelor of Engineering in Information Technology',
    school: 'University of Pune',
    place: 'India',
    gpa: '8.4',
    scale: '10',
    start: 'Aug 2016',
    end: 'Aug 2020'
  }
];

/* Tool names for the moving ribbon between sections (all from the Skills section). */
export const ribbon = [
  ['Python', 'SQL', 'Snowflake', 'PySpark', 'Airflow', 'DuckDB', 'PostgreSQL', 'Docker', 'Tableau', 'Power BI'],
  ['LangChain', 'LangGraph', 'ChromaDB', 'LiteLLM', 'Hugging Face', 'PyTorch', 'XGBoost', 'SHAP', 'MLflow', 'statsmodels']
];

/*
 * The shelf: one hardcover per piece of selected work. Text comes from the bullets and
 * projects above; bindings, sizes and cover motifs are design choices.
 * Each `motif` is drawn from the resume facts named in its `plate` caption.
 */
const role = id => experience.find(r => r.id === id);
const bullet = (id, i) => role(id).bullets[i].text;
const project = id => projects.find(p => p.id === id);

export const volumes = [
  {
    id: 'rag',
    title: 'RAG Data Assistant',
    subtitle: 'Helps staff discover institutional datasets and define data requests',
    source: role('uf'),
    layer: 'act',
    metric: { value: 85, suffix: '%', label: 'Recall@5', from: 60, note: 'up from 60%' },
    paragraphs: [bullet('uf', 0)],
    tools: ['Python', 'LangChain', 'ChromaDB', 'Hybrid search', 'Reranking'],
    binding: { cloth: '#6e2236', foil: '#e7b08f', clothName: 'Oxblood', foilName: 'Copper' },
    motif: 'retrieval',
    plate: 'Hybrid search with reranking: Recall@5 rose from 60% to 85%.',
    size: { w: 0.74, h: 1.06, t: 0.15 }
  },
  {
    id: 'dictionary',
    title: 'GPT-5 Data Dictionary',
    subtitle: 'Grounded definitions for ~200 Snowflake views (20K+ columns)',
    source: role('uf'),
    layer: 'act',
    metric: { value: 250, unit: 'hrs', label: 'Manual work saved' },
    paragraphs: [bullet('uf', 1)],
    tools: ['GPT-5', 'LiteLLM', 'Snowflake MCP', 'Snowflake'],
    binding: { cloth: '#e4dccb', foil: '#22324a', clothName: 'Bone', foilName: 'Ink' },
    motif: 'schema',
    plate: 'Metadata from Snowflake MCP, turned into grounded definitions for ~200 views (20K+ columns).',
    size: { w: 0.7, h: 1.0, t: 0.19 }
  },
  {
    id: 'classifier',
    title: 'Student Concern Classifier',
    subtitle: 'Routes high-priority student concerns to 15 Student Life units',
    source: role('uf'),
    layer: 'act',
    metric: { value: 90, suffix: '%', label: 'Agreement with human labels' },
    paragraphs: [bullet('uf', 2)],
    tools: ['GPT-5', 'Python', 'Snowflake', 'Few-shot prompting'],
    binding: { cloth: '#b84a66', foil: '#f6e7da', clothName: 'Rose', foilName: 'Bone' },
    motif: 'routing',
    plate: '16K+ Reddit posts a year, routed to 15 Student Life units.',
    size: { w: 0.72, h: 1.03, t: 0.12 }
  },
  {
    id: 'pantry',
    title: 'Food Pantry Data Pipeline',
    subtitle: 'Integrates 10+ data sources for a university food pantry dashboard',
    source: role('uf'),
    layer: 'move',
    metric: { value: 350, unit: 'hrs/yr', label: 'Staff hours saved' },
    paragraphs: [bullet('uf', 3)],
    tools: ['Snowflake', 'Python', 'DuckDB SQL'],
    binding: { cloth: '#1d4a63', foil: '#cfdde6', clothName: 'Harbor', foilName: 'Silver' },
    motif: 'confluence',
    plate: '10+ data sources feeding one food pantry dashboard, with DuckDB SQL for deduplication.',
    size: { w: 0.76, h: 1.08, t: 0.16 }
  },
  {
    id: 'ab',
    title: 'A/B Testing Framework',
    subtitle: 'Sample-size planning, significance testing and automated reporting',
    source: role('ctp'),
    layer: 'explain',
    metric: { value: 15, prefix: '+', suffix: '%', label: 'Donor conversion' },
    paragraphs: [bullet('ctp', 0)],
    tools: ['Python', 'SciPy', 'statsmodels'],
    binding: { cloth: '#c08a33', foil: '#3a2412', clothName: 'Ochre', foilName: 'Umber' },
    motif: 'curves',
    plate: 'Variant A against variant B. Winning variants raised donor conversion by 15%.',
    size: { w: 0.68, h: 0.98, t: 0.13 }
  },
  {
    id: 'clinical',
    title: 'Postoperative Risk Models',
    subtitle: 'Benchmarked and interpreted models for postoperative complication prediction',
    source: role('prismap'),
    layer: 'act',
    metric: { value: 30, label: 'Model configurations benchmarked' },
    paragraphs: [bullet('prismap', 0), bullet('prismap', 1)],
    tools: ['Logistic regression', 'Random forest', 'XGBoost', 'MLflow', 'SHAP', 'LIME', 'Partial dependence plots'],
    binding: { cloth: '#2e4b40', foil: '#d9c9a0', clothName: 'Forest', foilName: 'Brass' },
    motif: 'beeswarm',
    plate: 'SHAP, LIME and partial dependence plots interpret individual patient risk predictions.',
    size: { w: 0.73, h: 1.05, t: 0.17 }
  },
  {
    id: 'finance',
    title: 'Financial Reporting Pipelines',
    subtitle: 'ETL pipelines for financial reporting, processing 1M+ records daily',
    source: role('infosys'),
    layer: 'move',
    metric: { value: 1, suffix: '%', label: 'Mismatch rate', from: 5, note: 'down from 5%' },
    paragraphs: [bullet('infosys', 0), bullet('infosys', 1), bullet('infosys', 2), bullet('infosys', 3)],
    tools: ['Python', 'pandas', 'SAP HANA', 'SQL', 'Apache Airflow'],
    binding: { cloth: '#18243a', foil: '#c98a5a', clothName: 'Navy', foilName: 'Copper' },
    motif: 'dag',
    plate: 'Scheduled ETL with reconciliation checks: 1M+ records a day, mismatches cut from 5% to 1%.',
    size: { w: 0.75, h: 1.07, t: 0.18 }
  },
  {
    id: 'pii',
    title: project('pii').title,
    subtitle: 'spaCy NER, Hugging Face Transformers and regex pattern matching',
    source: { org: 'GitHub', url: project('pii').url, period: 'Project' },
    layer: 'act',
    metric: { value: 90, suffix: '%', label: 'Detection accuracy' },
    paragraphs: [project('pii').text],
    tools: project('pii').stack,
    binding: { cloth: '#2a2d33', foil: '#d7dadf', clothName: 'Graphite', foilName: 'Silver' },
    motif: 'redaction',
    plate: 'Sensitive fields detected and redacted, at 90% detection accuracy.',
    size: { w: 0.7, h: 1.01, t: 0.12 },
    demo: 'pii'
  },
  {
    id: 'recs',
    title: project('recs').title,
    subtitle: 'Title and visual similarity for 16K+ Amazon apparel products',
    source: { org: 'GitHub', url: project('recs').url, period: 'Project' },
    layer: 'act',
    metric: { value: 80, suffix: '%', label: 'Precision@10' },
    paragraphs: [project('recs').text],
    tools: [...project('recs').stack, 'TF-IDF', 'Word2Vec', 'VGG16'],
    binding: { cloth: '#a9c3d3', foil: '#1e3a56', clothName: 'Mist', foilName: 'Navy' },
    motif: 'neighbors',
    plate: 'Title and visual similarity across 16K+ Amazon apparel products, at 80% Precision@10.',
    size: { w: 0.72, h: 1.04, t: 0.14 },
    demo: 'recs'
  }
];
