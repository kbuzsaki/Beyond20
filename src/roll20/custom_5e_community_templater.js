var Custom5eCommunityTemplater = (function(){
    function macro(s) {
        if (s === "") return "";
        return "[[" + s + "]]";
    }

    function lookupFactor(f) {
        return {
            "half": 0.5,
            "twice": 2,
            "two": 2,
            "three": 3,
            "four": 4,
            "five": 5,
            "six": 6,
            "seven": 7,
            "eight": 8,
            "nine": 9,
            "ten": 10
        }[f];
    }

    function lookupHardcodedSaveSuccess(name) {
        let kNoDamageSpells = ["Frostbite", "Sacred Flame"];
        let kHalfDamageSpells = ["Spirit Guardians"];
        let kNoEffectSpells = [
            "Bane", "Command", "Entangle", "Faerie Fire", "Hypnotic Pattern", "Levitate",
            "Light", "Polymorph"];

        if (kNoDamageSpells.includes(name)) return "No damage.";
        if (kHalfDamageSpells.includes(name)) return "Half as much damage.";
        if (kNoEffectSpells.includes(name)) return "No effect.";

        return {
            "Detect Thoughts": "The spell ends (if you were trying to probe deeper into the creature's thoughts).",
            "Heat Metal": "The creature isn't forced to drop the object.",
            "Ice Knife": "No cold damage.",
            "Sanctuary": "A hostile creature may attack the target.",
            "Sleet Storm": "The creature does not fall prone.",
            "Thunderwave": "Half damage and no knockback."
        }[name] || "";
    }

    function stripPrefix(s, prefix) {
        if (s.substr(0, prefix.length) === prefix) return s.substr(prefix.length);
        return s;
    }

    function formatTitlecase(s) {
        if (s && s.length > 0) return s[0].toUpperCase() + s.substr(1);
        return "";
    }

    function removeTitlecase(s) {
        if (s && s.length > 0) return s[0].toLowerCase() + s.substr(1);
        return "";
    }

    function normalizeFt(dist) {
        return dist.replace("ft", "ft.").replace("ft..", "ft.");
    }

    function stripRecharge(name) {
        return name.replace(/\(Recharge[^)]+\)/, "").trim();
    }

    function formatDcs(desc) {
        let trimmed = desc.trim();
        let result = trimmed.replace(/DC (\d+)/g, "DC [[$1]]");
        return {
            "result": "result",
            "changed": (result != trimmed)
        };
    }

    function _buildDamages(values, types) {
        return (values || []).map((el, index) => ({value: values[index], type: types[index]}));
    }

    function _formatDamages(damages) {
        return damages.map((damage) => macro(damage.value) + " " + damage.type).join(", ");
    }

    function _condSegs(conditional_segment, other_segments) {
        let val = conditional_segment[conditional_segment.length - 1];
        if (val === undefined || val === "") return [];
        return [conditional_segment].concat(other_segments);
    }

    var CustomRequest = function(request) {
        this._request = request;
    };

    CustomRequest.prototype.type = function() { return this._request.type; };

    CustomRequest.prototype.isSpellCard = function() { return this.type() === "spell-card"; };

    CustomRequest.prototype.character = function() { return this._request.character || {}; };

    CustomRequest.prototype.getClassLevel = function(cclass) {
        let raw_class_level = (this.character().classes || {})[formatTitlecase(cclass)];
        if (raw_class_level === undefined) return undefined;
        return Number(raw_class_level);
    };

    CustomRequest.prototype.description = function() {
        return (this._request["description"] || "").replace(/\n\n\n+/gi, '\n\n').trim();
    };

    CustomRequest.prototype.isLeveledSpell = function() {
        return !this._request["level-school"].includes("Cantrip");
    };

    CustomRequest.prototype.isHealingSpell = function() {
        let damages = this.damages();
        return damages.length >= 1 && damages[0].type === "Healing";
    };

    CustomRequest.prototype.save_dc = function() { return this._request["save-dc"] || ""; };

    CustomRequest.prototype.save_ability = function() { return this._request["save-ability"] || ""; };

    CustomRequest.prototype.hideActorName = function() {
        return this._request["whisper"] === WhisperType.HIDE_NAMES ||
               this._request["whisper"] === WhisperType.HIDE_CREATURE_NAMES;
    };

    CustomRequest.prototype.hideActionName = function() {
        return this._request["whisper"] === WhisperType.HIDE_NAMES ||
               this._request["whisper"] === WhisperType.HIDE_ACTION_NAMES;
    };

    CustomRequest.prototype.suppressDescription = function() {
        switch (settings["roll20-suppress-description"]) {
            case "with-shift": return this._request["advantage"] === RollType.ADVANTAGE;
            case "with-ctrl": return this._request["advantage"] === RollType.DISADVANTAGE;
            case "never": return false;
        }
        return false;
    };

    CustomRequest.prototype.showMonsterAttackEffects = function() {
        return settings["show-monster-effect"];
    };

    CustomRequest.prototype.showSpellInfoBlock = function() {
        switch (settings["roll20-spell-info-display"]) {
            case "always": return true;
            case "leveled-spells": return this.isLeveledSpell();
            case "display-in-vtt": return this.isSpellCard();
            case "leveled-spells-or-display": return this.isLeveledSpell() || this.isSpellCard();
        }
        return false;
    };

    CustomRequest.prototype.inferSpellInfo = function() { return settings["roll20-infer-spell-info"]; };

    CustomRequest.prototype.showSpellDescription = function() {
        if (this.suppressDescription()) return false;
        if (this._request["damages"] === undefined) return true;
        switch (settings["roll20-spell-effect-display"]) {
            case "always": return true;
            case "leveled-spells": return this.isLeveledSpell();
            case "save-dc": return this.save_dc() !== "";
        }
        return false;
    };

    CustomRequest.prototype.damages = function() {
        return _buildDamages(this._request["damages"], this._request["damage-types"]);
    };

    CustomRequest.prototype.criticalDamages = function() {
        return _buildDamages(this._request["critical-damages"], this._request["critical-damage-types"]);
    };

    CustomRequest.prototype.getActorName = function() {
        if (this.hideActorName()) return "???";
        return this.character().name || "";
    };

    CustomRequest.prototype.getActionName = function() {
        return stripRecharge(this._request["name"]);
    };

    CustomRequest.prototype.getTitle = function() {
        switch (this.type()) {
            case "saving-throw": return this._request["name"] + " saving throw";
            case "skill": return this._request["skill"] + " (" + this._request["ability"] + ")";
            case "initiative": return "Initiative";
            case "hit-dice": return "Spending Hit Dice - " + this._request["roll"].split("+")[0];
            case "death-save": return "Death Save";
            case "attack":
            case "spell-attack":
            case "spell-card":
                if (this.hideActionName()) return "???";
                /* falls through */
            default:
                return this.getActionName();
        }
    };

    CustomRequest.prototype.getActionTypeName = function() {
        switch (this.type()) {
            case "spell-card":
            case "spell-attack": return this._request["level-school"];
            case "attack": return ((this._request["attack-type"] || "") + " Attack").replace("Attack Attack", "Attack").trim();
            case "item": return this._request["item-type"];
            case "hit-dice": return this._request["class"];
            default: {
                if (this._request.proficiency !== undefined) {
                    return this._request.proficiency.replace("Proficiency", "Proficient");
                } else if (this._request.source !== undefined) {
                    return [this._request["source"], this._request["source-type"]].filter(el => el).join(", ");
                } else {
                    return "";
                }
            }
        }
    };

    CustomRequest.prototype.getActionTags = function() {
        return [
            this._request.concentration ? "(Concentration)" : "",
            this._request.ritual ? "(Ritual)" : "",
        ].join(" ").trim();
    };

    CustomRequest.prototype.getRollAttributes = function() {
        let roll_meta = this.type() === "initiative" ? " &{tracker}" : "";
        let roll = macro(this._request["roll"] + roll_meta);
        let one_roll = [["roll", roll]];
        let adv_rolls = [["roll1", roll], ["roll2", roll]];
        return {
            "skill":        {rolls: adv_rolls, types: ["simple", "showadvroll", "ability"], name: "Result"},
            "ability":      {rolls: adv_rolls, types: ["simple", "showadvroll", "ability"], name: "Result"},
            "saving-throw": {rolls: adv_rolls, types: ["simple", "showadvroll", "save"],
                             name: this._request["ability"] + " save"},
            "death-save":   {rolls: adv_rolls, types: ["simple", "noadvroll", "deathsave"], name: "Death save"},
            "initiative":   {rolls: one_roll, types: [], name: "Initiative"},
            "hit-dice":     {rolls: one_roll, types: [], name: "HP Regained"},
            "custom":       {rolls: one_roll, types: [], name: "Result"}
        }[this.type()] || {rolls: [], types: [], name: ""};
    };

    CustomRequest.prototype.getFormattedDescription = function() {
        if (this.suppressDescription()) return "";
        let description = this.description();

        let matchers = [
            {matcher: /\b(\S+)( times)? your (\S+) level/, factor_index: 1, class_index: 3}
        ];
        for (let matcher of matchers) {
            let matches = description.match(matcher.matcher);
            if (matches) {
                let factor = lookupFactor(matches[matcher.factor_index]);
                let class_level = this.getClassLevel(matches[matcher.class_index]);
                if (factor === undefined || class_level === undefined) continue;

                let calculation = " (" + macro(factor + " * " + class_level) + ")";
                description = description.substr(0, matches.index) + matches[0] + calculation +
                    description.substr(matches.index + matches[0].length);
                break;
            }
        }

        return description;
    };

    CustomRequest.prototype.getAttackRoll = function() {
        if (this._request["to-hit"] === undefined) return "";
        let crit_limit = this._request["critical-limit"];
        let crit_thresh = crit_limit !== undefined ? "cs>" + crit_limit : "";
        let to_hit = this._request["to-hit"];
        return macro("1d20" + crit_thresh + to_hit);
    };

    CustomRequest.prototype.getFormattedDamages = function() { return _formatDamages(this.damages()); };

    CustomRequest.prototype.getFormattedCritDamages = function() {
        return _formatDamages(this.criticalDamages());
    };

    CustomRequest.prototype.getFormattedHealing = function() {
        if (!this.isHealingSpell()) return "";
        return macro(this.damages()[0].value);
    };

    CustomRequest.prototype.getFormattedSecondaryDamages = function() {
        return _formatDamages(this.damages().slice(1));
    };

    CustomRequest.prototype.getAttackDescription = function() {
        if (this.character().type === "Monster" && !this.showMonsterAttackEffects()) return "";
        if (this.suppressDescription()) return "";

        let description = this.description();

        // Check whether this is an attack with an on-hit effect
        let matcher = /Hit:[^\.D]+damage(, and|,|\.)(.*)/;
        let matches = description.match(matcher);
        // TODO: fix erroneous matches like a hobgoblin's versatile longsword
        if (matches && matches.length > 2 && matches[2].trim() !== "") {
            return "On hit, " + removeTitlecase(formatDcs(matches[2]).result);
        }

        // Check whether this is a supplemental effect (e.g. a Boar's charge)
        if (description !== "" && !description.match(/Hit:/)) {
            // Strip off the embedded attack name.
            return formatDcs(stripPrefix(description, this._request["name"] + ".").trim()).result;
        }

        // If there's a save DC without description text, fall back to just displaying that.
        if (this.save_dc() !== "") {
            return ["DC", macro(this.save_dc()), this.save_ability(), "save"].join(" ");
        }

        return "";
    };

    CustomRequest.prototype.getSpellEffectMacros = function() {
        if (!this.isHealingSpell()) return "";
        let effect = this.getFormattedSecondaryDamages();
        return effect.length === 0 ? "" : "Additional effect: " + effect;
    };

    CustomRequest.prototype.getDisplayedSpellEffect = function() {
        if (!this.showSpellDescription()) return "";
        return this.description();
    };

    CustomRequest.prototype.getInferredSaveSuccess = function() {
        if (!this.inferSpellInfo()) return "";

        let hardcodedSaveSuccess = lookupHardcodedSaveSuccess(this.getActionName());
        if (hardcodedSaveSuccess !== "") return hardcodedSaveSuccess;

        let heuristics = [
            {matcher: /saving throw\.?[^.]+failed[^.]+half as much[^.]+successful (one|save)\./,
             result: "Half as much damage."}
        ];

        let description = this.description();
        for (let heuristic of heuristics) {
            let matches = description.match(heuristic.matcher);
            if (matches) {
                return heuristic.result;
            }
        }

        return "";
    };

    CustomRequest.prototype.getDisplayedSaveSuccess = function() {
        let inferred_save_success = this.getInferredSaveSuccess();
        if (inferred_save_success !== "") return inferred_save_success;
        return "See full description.";
    };

    CustomRequest.prototype.getInferredSpellRange = function() {
        if (!this.inferSpellInfo()) return "";
        let matches = this.description().match(/(\d+) feet/);
        if (matches) return matches[1] + "ft.";
        return "";
    };

    CustomRequest.prototype.getInferredSpellTarget = function() {
        if (!this.inferSpellInfo()) return "";

        let matchers = [
            /((an?|(one|two)( [^.]+)?|up to [^.]+|any [^.]+) (creature|humanoid|beast|object|unoccupied space)s?[^.]*) (with)?in range/i,
            /((an?|(one|two)( [^.]+)?|up to [^.]+|any [^.]+) (creature|humanoid|beast|object|unoccupied space)s?[^.]* with which you are familiar)/i,
            /you touch ((an?|one) ([^.]+ )?(creature|humanoid|beast|object))/i,
            /(an? [^.]+) you touch/i
        ];

        let description = this.description();
        for (let matcher of matchers) {
            let matches = description.match(matcher);
            if (matches) {
                return removeTitlecase(matches[1].replace(" of your choice", "").trim());
            }
        }

        return "";
    };

    CustomRequest.prototype.getSpellInfo = function() {
        if (!this.showSpellInfoBlock()) return {};

        // parse out the range and target
        let range_target = this._request["range"].trim();
        let range = range_target.split("/")[0].split("(")[0].trim();
        let target = range_target.substr(range.length).replace(/[(\)\/]/g, "").trim();
        if (range === "Self" && target === "") {
            target = "Self";
            range = this.getInferredSpellRange() || "--";
        } else {
            target = target || this.getInferredSpellTarget();
        }

        // ignore the specific material components
        let components = this._request["components"].split("(")[0].trim();

        let aoe_shape = formatTitlecase(this._request["aoe-shape"]);
        return {
            gained_from: this._request["gained-from"],
            components:  components,
            cast_time:   this._request["casting-time"],
            duration:    this._request["duration"],
            target:      [normalizeFt(target), aoe_shape].join(" ").trim(),
            range:       range
        };
    };

    function template5eCommunityRequest(request) {
        let get_check_segments = (request) => {
            let roll_attrs = request.getRollAttributes();
            return [["rollname", roll_attrs.name], ["freetext", request.getFormattedDescription()]]
                .concat(roll_attrs.types).concat(roll_attrs.rolls);
        };
        let get_attack_segments = (request) => {
            let attack_roll = request.getAttackRoll();
            let damage = request.getFormattedDamages();
            let crit_damage = request.getFormattedCritDamages();
            let description = request.getAttackDescription();

            // Special handling to use the regular weapon template for character basic attacks
            if (attack_roll && request.character().type === "Character") {
                return ["simple", "weapon", "showadvroll", ["rollname", "Attack"], ["roll1", attack_roll],
                        ["roll2", attack_roll], ["weapondamage", damage], ["weaponcritdamage", crit_damage]];
            }

            return ["weapon", ["attack", attack_roll], ["attackadv", attack_roll],
                    ["damage", damage], ["critdamage", crit_damage], ["freetext", description]];
        };
        let get_spell_segments = (request) => {
            let request_map = request._request;

            let attack_roll = request.getAttackRoll();
            let to_hit_segs = _condSegs(["spellattack", attack_roll],
                ["spellshowattack", "spellshowattackadv", ["spellattackadv", attack_roll]]);

            let save_segs = _condSegs(["spellsavedc", macro(request.save_dc())],
                ["spellshowsavethrow", ["spellsavesuccess", request.getDisplayedSaveSuccess()],
                 ["spellsavestat", request.save_ability()]]);

            let damage_segs = _condSegs(["spelldamage", request.getFormattedDamages()], ["spellshowdamage"]);
            let crit_segs = _condSegs(["spellcritdamage", request.getFormattedCritDamages()], ["spellcancrit"]);
            let healing_segs = _condSegs(["spellhealing", request.getFormattedHealing()], ["spellshowhealing"]);
            if (healing_segs.length !== 0) damage_segs = healing_segs;

            let effect = [request.getSpellEffectMacros(), request.getDisplayedSpellEffect()].join("\n").trim();
            let effect_segs = _condSegs(["spelleffect", effect], ["spellshoweffects"]);

            let info = request.getSpellInfo();
            let spell_info_segs = _condSegs(["spellgainedfrom", info.gained_from],
                [["spellshowinfoblock"], ["spellcomponents", info.components], ["spellcasttime", info.cast_time],
                ["spellduration", info.duration], ["spelltarget", info.target], ["spellrange", info.range]]);

            return ["spell"].concat(spell_info_segs).concat(to_hit_segs).concat(save_segs)
                .concat(damage_segs).concat(crit_segs).concat(effect_segs);
        };

        var community_request = new CustomRequest(request);

        let header_segments = [["title", community_request.getTitle()],
                               ["subheader", community_request.getActorName()],
                               ["subheaderright", community_request.getActionTypeName()],
                               ["subheader2", community_request.getActionTags()]];
        let body_segments = [];
        if (["attack"].includes(community_request.type())) {
            body_segments = get_attack_segments(community_request);
        } else if (["spell-attack", "spell-card"].includes(community_request.type())) {
            body_segments = get_spell_segments(community_request);
        } else {
            body_segments = get_check_segments(community_request);
        }

        let segments = header_segments.concat(body_segments);
        console.log("segments:", segments);
        return "&{template:5eDefault}" + segments
            .filter(el => el.length > 0 && el[el.length - 1] !== undefined && el[el.length - 1] !== "")
            .map(p => "{{" + (((typeof p) === "string") ? p + "=1" : p[0] + "=" + p[1]) + "}}")
            .join(" ");
    }

    var Custom5eCommunityTemplater = function() {};

    Custom5eCommunityTemplater.prototype.templateRequest = function(request) {
        return whisperString(request.whisper) + " " + template5eCommunityRequest(request);
    };

    return Custom5eCommunityTemplater;
})();

var custom_5e_community_templater = new Custom5eCommunityTemplater();
console.log("Loaded: Custom 5e Community Templater");
