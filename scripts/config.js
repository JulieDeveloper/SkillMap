// config.js — Role definitions and API configuration

export const ROLES = [
  {
    id: 'uiux',
    label: 'UI/UX Designer',
    query: 'UI+UX+Designer'
  },
  {
    id: 'product',
    label: 'Product Designer',
    query: 'Product+Designer'
  },
  {
    id: 'graphic',
    label: 'Graphic Designer',
    query: 'Graphic+Designer'
  },
  {
    id: 'experiential',
    label: 'Experiential Designer',
    query: 'Experiential+Designer'
  },
  {
    id: 'digital',
    label: 'Digital Designer',
    query: 'Digital+Designer'
  },
  {
    id: 'visual',
    label: 'Visual Designer',
    query: 'Visual+Designer'
  },
  {
    id: 'multidisciplinary',
    label: 'Multidisciplinary Designer',
    query: 'Multidisciplinary+Designer'
  }
];

export const API_CONFIG = {
  baseUrl: 'https://fantastic-jobs.p.rapidapi.com/jobs',
  location: 'Ontario,Canada',
  maxJobsPerFetch: 50,
  delayBetweenRequests: 1500 // milliseconds
};

export const INITIAL_QUOTA = {
  requestsRemain: 25,
  jobsRemain: 250
};
