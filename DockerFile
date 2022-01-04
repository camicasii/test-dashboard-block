# The image to pull the base configuration from
FROM nginx
# The directory where any additional files will be referenced
WORKDIR /usr/local/app
# Copy the custom default.conf from the WORKDIR (.) and overwrite the existing internal configuration in the NGINX container
COPY ./nginx /etc/nginx/conf.d
#./default.conf /etc/nginx/conf.d/default.conf
COPY  ./build /var/www/html 
EXPOSE 80