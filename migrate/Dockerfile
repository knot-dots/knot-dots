FROM migrate/migrate:4 AS production
COPY ./sql /srv/migrations
ENTRYPOINT ["migrate", "-database", "postgres:///", "-path",  "/srv/migrations"]
CMD ["up"]
