const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;

const MIN_TO_MS = 60 * 1000;

function Post(data) {
    this._init(data);
}

Post.prototype = {
    _init: function(data) {
        this.id = data.id;
        this.subreddit = data.subreddit;
        this.domain = data.domain
        this.stickied = data.stickied;
        this.author = data.author;
        this.title = data.title;
        this.url = data.url;

    }
}

function Subreddit(session, sub) {
    this._init(session, sub);
}

Subreddit.prototype = {
    _init: function(session, sub) {
        this.session = session;
        this.sub = sub;
        this.url = "http://www.reddit.com/r/%s/.json".format(sub);
        this.posts = [];
    },

    get: function() {
        let message = Soup.Message.new("GET", this.url);

        this.session.queue_message(message, Lang.bind(this, this._onResponse));
    },

    _onResponse: function(session, message) {
        if(message.status_code != 200) {
            this._processResponse(message.status_code, null);
        } else {
            let resultJSON = message.response_body.data;
            let result = JSON.parse(resultJSON);
            this._processResponse(null, result);
        }
    },

    _processResponse: function(error, result) {
        if(error !== null) {
            this.posts = [];
        } else {
            let resultPosts = result.data.children;
            this.posts =
                resultPosts.map(function(c) { return new Post(c.data); });
        }
        if(this.onLoad) {
            this.onLoad();
        }
    }

}

function RedditModel(subs) {
    this._init(subs);
}

RedditModel.prototype = {
    _init: function(subs) {
        this.session = new Soup.Session();
        this.subs = new Subreddit(this.session, subs);
    },

    getPosts: function() {
        return this.subs.posts;
    },

    refresh: function() {
        this.subs.get();
    },

    setOnLoad: function(callback) {
        this.onLoad = callback;
        this.subs.onLoad = callback;
    },

    setSubs: function(subs) {
        this.subs = new Subreddit(this.session, subs);
        this.subs.onLoad = this.onLoad;
    }
}

function RedditDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

RedditDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.metadata = metadata;

        
        try {
            this.settings = new Settings.DeskletSettings(
                    this, this.metadata.uuid, this.instance_id);
            // property for subreddits
            this.settings.bindProperty(
                    Settings.BindingDirection.IN,
                    "subreddit",
                    "subreddit",
                    this._onSubredditChange,
                    null);
            this.settings.bindProperty(
                    Settings.BindingDirection.IN,
                    "width",
                    "width",
                    this._onSizeChange,
                    null);
            this.settings.bindProperty(
                    Settings.BindingDirection.IN,
                    "height",
                    "height",
                    this._onSizeChange,
                    null);
            this.settings.bindProperty(
                    Settings.BindingDirection.IN,
                    "refreshRate",
                    "refreshRate",
                    this._updateLoop,
                    null);
        } catch (e) {
            global.logError(e);
        }
        
        this.setupUI();
        this.model = new RedditModel(this.subreddit);
        this.model.setOnLoad(Lang.bind(this, this.draw));
        this.model.refresh();
    },
    
    setupUI: function() {
        this._redditBox = new St.BoxLayout({vertical: true,
                                            width: this.width,
                                            height: this.height,
                                            style_class: "reddit-reader"});
        
        let titlebar = new St.BoxLayout({vertical: false,
                                         style_class: "reddit-title-bar"});
        let icon = new St.Icon({
            icon_name: "web-browser-symbolic",
            style_class: "reddit-header-icon"});
        let headerButton = new St.Button();
        let name = new St.Label({ text: "reddit" });
        headerButton.add_actor(icon);
        headerButton.connect("clicked", function(button, event) {
            Util.spawnCommandLine("xdg-open http://www.reddit.com");
        });
        titlebar.add(headerButton);
        titlebar.add(name);
        this._redditBox.add(titlebar);

        this._view = new St.ScrollView();
        this._redditBox.add(this._view, { expand: true });
        this._view.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    },

    draw: function() {
        if(this._postBox) {
            this._postBox.destroy();
        }
        this._postBox = new St.BoxLayout({ vertical: true,
                                           style_class: "reddit-posts-box"});
        this._view.add_actor(this._postBox);

        let posts = this.model.getPosts();
        for(let i = 0; i < posts.length; i++) {
            let postButton = new St.Button({style_class: "reddit-post",
                                            x_align: St.Align.START});
            postButton.connect("clicked", Lang.bind(posts[i], function(b, e) {
                Util.spawnCommandLine("xdg-open %s".format(this.url));
            }));
            let postLabel = new St.Label({text: posts[i].title});
            postButton.add_actor(postLabel);
            this._postBox.add(postButton);
        }

        this.setContent(this._redditBox);
    },

    _onSubredditChange: function() {
        this.model.setSubs(this.subreddit);
        this.model.refresh();
    },

    _onSizeChange: function() {
        this._redditBox.destroy();
        this.setupUI();
        this.draw();
    },

    _updateLoop: function() {
        if(this.update_id) {
            Mainloop.source_remove(this.update_id);
            this.update_id = 0;
        }
        this.model.refresh();
        let timeout = this.refreshRate * MIN_TO_MS;
        this.update_id = 
            Mainloop.timeout_add(timeout, 
                                 Lang.bind(this, this._updateLoop));
    }
}

function main(metadata, desklet_id) {
    return new RedditDesklet(metadata, desklet_id);
}
