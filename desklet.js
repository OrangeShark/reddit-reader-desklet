const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Soup = imports.gi.Soup;

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
        } catch (e) {
            global.logError(e);
        }


        this.model = new RedditModel(this.subreddit);
        this.model.refresh();
        this.draw();
    },

    draw: function() {
        this._redditBox = new St.BoxLayout({vertical: true,
                                            width: this.width,
                                            height: this.height,
                                            style_class: "reddit-reader"});
        
        let name = new St.Label({ text: "reddit" });
        this._redditBox.add(name);

        this._view = new St.ScrollView();
        this._redditBox.add(this._view, { expand: true });
        this._view.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        this._postBox = new St.BoxLayout({ vertical: true });
        this._view.add_actor(this._postBox);

        let posts = this.model.getPosts();
        for(let i = 0; i < posts.length; i++) {
            let postLabel = new St.Label({text: posts[i].title});
            this._postBox.add(postLabel);
        }

        this.setContent(this._redditBox);
    },

    _onSubredditChange: function() {

    },

    _onSizeChange: function() {
        this._redditBox.destroy();
        this.draw();
    }
}

function main(metadata, desklet_id) {
    return new RedditDesklet(metadata, desklet_id);
}
