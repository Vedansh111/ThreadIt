/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["mythreaditbucket.s3.ap-south-1.amazonaws.com", "lib.googleusercontent.com", "lib3.googleusercontent.com", "lh3.googleusercontent.com" ],
  },
};

module.exports = nextConfig;
