# Basic Makefile

build:
	glib-compile-schemas --strict --targetdir=custom-accent-colors@demiskp/schemas/ custom-accent-colors@demiskp/schemas

install: custom-accent-colors@demiskp/schemas/gschemas.compiled
	install -d ~/.local/share/gnome-shell/extensions
	cp -a custom-accent-colors@demiskp/ ~/.local/share/gnome-shell/extensions/
