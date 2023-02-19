# Basic Makefile

GSCHEMAS := ./custom-accent-colors@demiskp/schemas/gschemas.compiled

$(GSCHEMAS):
	glib-compile-schemas --strict --targetdir=./custom-accent-colors@demiskp/schemas ./custom-accent-colors@demiskp/schemas

install: $(GSCHEMAS)
	install -d $(HOME)/.local/share/gnome-shell/extensions
	cp -a ./custom-accent-colors@demiskp $(HOME)/.local/share/gnome-shell/extensions

clean:
	rm -rf $(HOME)/.local/share/gnome-shell/extensions/custom-accent-colors@demiskp
	rm -f $(GSCHEMAS)
