FROM node:26-alpine

# Set the working directory inside the container
WORKDIR /saul

# Copy files to the container
COPY . .    

# Install dependencies
RUN npm install

# Run the Vite dev server
CMD ["npm", "run", "test"]
