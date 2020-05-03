PYJ_GLOBALS='$$,chrome,Marka,alertify'

src/%.js: src/%.pyj
	rapydscript lint --globals $(PYJ_GLOBALS) $(PYJ_FLAGS) $<
	rapydscript $(PYJ_FLAGS) $< --output $@
	perl -pi -e "s/async;\r?\n/async/" $@


JS_FILES=src/background.js \
		 src/roll20.js \
		 src/roll20_script.js \
		 src/fvtt.js \
		 src/fvtt_script.js \
		 src/dndbeyond_character.js \
		 src/dndbeyond_monster.js \
		 src/dndbeyond_spell.js \
		 src/dndbeyond_encounter.js \
		 src/dndbeyond_items.js  \
		 src/dndbeyond_vehicle.js \
		 src/options.js \
		 src/popup.js \
		 src/default_popup.js

PYJ_DEPS=src/utils.pyj \
		 src/settings.pyj \
		 src/dndbeyond.pyj \
		 src/dndbeyond_dice.pyj \
		 src/constants.pyj \
		 src/roll_renderer.pyj \
		 src/dndbeyond_discord.pyj

EXTENSION_FILES=manifest.json *.html options.css images/ libs/ src/*.js src/beyond20.css
EXTENSION_ARCHIVE=Beyond20.zip

src/fvtt_script.js: PYJ_GLOBALS='$$,chrome,game,canvas,Roll,ChatMessage,ui,Hooks,Dialog,ImagePopout,ENTITY_PERMISSIONS,CONFIG,CHAT_MESSAGE_TYPES,CONST,CONFIG,isNewerVersion'
src/utils.pyj-cached: PYJ_GLOBALS='$$,chrome,browser,cloneInto,alertify'
src/constants.pyj-cached: PYJ_FLAGS+=--noqa eol-semicolon

all:  $(PYJ_DEPS:=-cached) $(JS_FILES) $(EXTENSION_ARCHIVE)

$(JS_FILES): $(PYJ_DEPS)

$(EXTENSION_ARCHIVE): $(EXTENSION_FILES)
	zip -q -r Beyond20.zip $(EXTENSION_FILES)

build: all
	rm -f *~ */*~ */*/*~ src/*.pyj-cached
	rm -rf docs/_site
	web-ext build

clean:
	rm -f $(JS_FILES) $(EXTENSION_ARCHIVE) *~ */*~ src/*.pyj-cached 

new: clean all

%.pyj-cached: %.pyj
	rapydscript lint --globals $(PYJ_GLOBALS) $(PYJ_FLAGS) $<
	@rm -f $@


.PHONY: all clean build new
