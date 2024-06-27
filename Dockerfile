# Use official Node.js 22 as base image
FROM node:22

# Install cron
RUN apt-get update && apt-get install -y cron

# Set the timezone
ENV TZ=Pacific/Auckland

# Copy the cron job file into the Docker image
COPY mycron /etc/cron.d/mycron

# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/mycron

# Apply cron job
RUN crontab /etc/cron.d/mycron

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy the rest of the source code
COPY . .

# Install dependencies
RUN npm install

# Compile TypeScript to JavaScript
RUN npx tsc

# Copy the env file
COPY ./.env ./build/.env

# Add execute permission
RUN chmod +x start.sh

# Run the start.sh script when the container starts
CMD ["./start.sh"]