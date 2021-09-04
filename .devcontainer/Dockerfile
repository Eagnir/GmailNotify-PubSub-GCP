# Dockerfile for NodeJS 14 Dev Evn.
# Ubuntu - v20.04
# node - v14.x
# npm - v6.x

FROM ubuntu:20.04

# Configure TimeZone
ENV TZ=Asia/Kolkata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# install any updates (standard routine for a fresh system)
RUN apt-get update
RUN apt-get upgrade -y

# Install wget to download files
RUN apt-get -y install wget

# Create temp directory
WORKDIR /temp_downloads

# Install Nodejs and npm (npm is bundled with nodejs)
RUN wget https://deb.nodesource.com/setup_14.x

RUN bash setup_14.x
RUN apt-get install -y nodejs

# Confirm node and npm versions
RUN node -v
RUN npm -v

# Clean up
WORKDIR /
RUN rm -rf /temp_downloads

# Final confirmation message
RUN echo "Successfully setup NodeJS v14 ENV"