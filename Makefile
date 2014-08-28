FILES=										\
		desklet.js 						\
		icon.png 							\
		metadata.json 				\
		settings-schema.json 	\
		stylesheet.css

UUID= reddit-reader@orangeshark
DESKLETDIR= ~/.local/share/cinnamon/desklets/
DESTDIR= $(DESKLETDIR)$(UUID)

.PHONY: install dist

install: $(FILES)
	mkdir -p $(DESTDIR)
	cp $(FILES) $(DESTDIR)

dist: $(FILES)
	zip $(UUID) $(FILES)
