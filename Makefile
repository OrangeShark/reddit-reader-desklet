FILES=										\
		desklet.js 						\
		icon.png 							\
		metadata.json 				\
		settings-schema.json 	\
		stylesheet.css				\
		COPYING								\
		CHANGELOG

UUID= reddit-reader@orangeshark
DESKLETDIR= ~/.local/share/cinnamon/desklets/
DESTDIR= $(DESKLETDIR)$(UUID)

.PHONY: install dist clean

install: $(FILES)
	mkdir -p $(DESTDIR)
	cp $(FILES) $(DESTDIR)

dist: $(FILES)
	mkdir -p $(UUID)
	cp $(FILES) $(UUID)
	zip -r $(UUID) $(UUID)
	rm -r $(UUID)

clean:
	rm $(UUID).zip
