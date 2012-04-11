(function($, undefined){

	var Imagery = ({
		type : "imagery",
		png : true,
		option : {
			events : [ "click", "mouseover", "mouseout", "mouseenter", "mouseleave" ]
		},
		initialize:function(){
			var ua = navigator.userAgent.match(/MSIE\s([\d\.]+?);/);
			if(ua !== null){
				this.png = parseInt(ua[1]) > 8;
			}
			if(! this.png){
				this.initVml();
			}
			return this;
		},
		initVml : function(){
			var self = this;
			// add namespace
			(function(ns){
				if(!ns[self.type]){
					ns.add(self.type, "urn:schemas-microsoft-com:vml");
				}
			}(document.namespaces));
			// add selector
			(function(){
				var ss, style;
				ss = $("<style>").appendTo($("head"))[0].styleSheet;
				style = "{behavior:url(#default#VML);display:inline-block;}";
				ss.addRule(self.type + "\\:rect", style);
				ss.addRule(self.type + "\\:fill", style);
			}());
			return this;
		},
		createVmlImage : function(src, width, height){
			var self, rect, fill;
			self = this;
			rect = $(document.createElement(self.type + ":rect"));
			rect.prop("stroked", false);
			rect.css({
				position:"absolute",
				width:width,
				height:height
			});
			fill = $(document.createElement(self.type + ":fill"));
			fill.prop({
				src : src,
				on : true,
				type : "frame"
			});
			fill.appendTo(rect);
			rect.on("append", function(){
				$(this).find("fill")[0].color = "none";
			});
			return rect;
		},

		simplate : function(str, vars){
			return str.replace(/{{(\w+?)}}/g, function(a,b){
				return vars[b] || "";
			});
		},
		isLoaded : function(img){
			if(img.tagName.toLowerCase() != "img"){ return null; }
			if(! img.complete){ return false; }
			if(typeof img.naturalWidth != "undefined" && img.naturalWidth == 0){ return false; }
			return true;
		},
		isImg : function(ele){
			return ele.nodeName.toLowerCase() == "img";
		},
		getVml : function(ele){
			var vml = $(ele).data(this.type + "-vml");
			if(vml){
				return vml;
			}
			return null;
		},
		getSource : function(ele){
			var o = $(ele);
			if(this.isImg(ele)){
				return $(ele).prop("src");
			} else {
				var m = o.css("background-image").match(/url\("?(.+?)"?\)$/);
				return m[1] || "";
			}
			return null;
		},
		getStateSource : function(src, postfix){
			return src.replace(/\.(\w+?)$/, function(a,b){
				return postfix + a;
			});
		},
		setOpacity : function(ele, opacity){
			var vml = this.getVml(ele);
			if(vml){
				vml.find("fill").prop("opacity", opacity);
			} else {
				$(ele).css("opacity", opacity);
			}
		},

		/**
		 * Public
		 */
		alpha : function($ele){
			var self, set;
			if(this.png){ return; }
			self = this;
			set = function(){
				var o, src, vml;
				o = $(this);
				src = self.getSource(this);
				if(/\.png$/.test(src)){
					vml = self.createVmlImage(
						self.getSource(this),
						o.width(),
						o.height()
					);
					vml.insertBefore(o).trigger("append");
					o.css("visibility", "hidden");
					o.data(self.type + "-vml", vml);
					vml.on(self.option.events.join(" "), function(e){
						// todo : why called twice ?
						o.trigger(e.type);
					});
				}
			};
			$ele.each(function(){
				var o;
				o = $(this);
				if(this.tagName.toLowerCase() == "img" && !o.width()){
					o.on("load", set);
				} else {
					set.call(this);
				}
			});
			return this;
		},
		swap : function($ele, src){
			var ele, vml;
			ele = $ele[0];
			vml = this.getVml(ele);
			if(vml){
				vml.find("fill").prop("src", src);
				return;
			}
			if(this.isImg(ele)){
				$ele.attr("src", src);
			} else {
				$ele.css("background-image", "url(" + src + ")");
			}
			return this;
		},
		swapOnHover : function($ele, config){
			var self, option, handler;
			self = this;
			option = {
				postfix : "-hover",
				normal : this.type + "-default-src",
				hover : this.type + "-hover-src",
				ignore : function(){ return false; }
			};
			$.extend(option, config);
			handler = function(e){
				var o = $(e.target);
				if(! option.ignore.call(this)){
					switch(e.type){
						case "mouseenter" : self.swap(o, o.data(option.hover)); break;
						case "mouseleave" : self.swap(o, o.data(option.normal)); break;
						default : break;
					}
				}
			};
			$ele.each(function(){
				var ele, o, src, hover;
				ele = this;
				o = $(this);
				src = self.getSource(this);
				o.data(option.normal, src);
				o.data(option.hover, self.getStateSource(src, option.postfix));
				hover = new Image();
				hover.onload = function(){
					o.hover(handler, handler);
				};
				hover.src = o.data(option.hover);
			});
			return this;
		},
		fade : function($ele, opacity, config){
			var self, option, run;
			self = this;
			option = {
				duration : 500,
				flag : this.type + "-fade-complete",
				interval : 3
			};
			$.extend(option, config);
			run = function(ele){
				var o = $(ele);
				if(o.data(option.flag)){ return; }
				self.setOpacity(ele, o.css("opacity"));
				setTimeout(function(){
					run(ele)
				}, option.interval);
			};
			$ele.each(function(){
				var o = $(this);
				o.data(option.flag, false);
				if(self.getVml(this)){
					run(this);
				}
				o.stop().fadeTo(option.duration, opacity, function(){
					o.data(option.flag, true);
				});
			});
		},
		blendOnHover : function($ele, config){
			var self, option, handler;
			self = this;
			option = {
				postfix : "-hover",
				origin : this.type + "-blend-origin",
				durationOnEnter : 100,
				durationOnLeave : 300,
				interval : 3,
				ignore : function(){ return false; }
			};
			$.extend(option, config);
			handler = function(e){
				var o, enter;
				o = $(this);
				enter = e.type == "mouseenter" ? 1 : 0;
				if(! option.ignore.call(o.data(option.origin))){
					self.fade($(this), enter ? 1 : 0, {
						duration : enter ? option.durationOnEnter : option.durationOnLeave,
						interval : option.interval
					});
				}
			};
			$ele.each(function(){
				var o, src, above;
				o = $(this);
				src = self.getStateSource(self.getSource(this), option.postfix);
				above = $("<img>").attr({
					src : src,
					width : o.width(),
					height : o.height()
				}).css({
					"position" : "absolute"
				}).data(option.origin, this);
				above.insertBefore(o);
				self.alpha(above);
				self.setOpacity(above, 0);
				above.hover(handler, handler);
				above.on(self.option.events.join(" "), function(e){
					e.preventDefault();
					e.stopPropagation();
					o.trigger(e.type);
				});
			});
		}



	}).initialize();

	window.Imagery = Imagery;



	var foo = $(".foo");
	foo.on("click", function(){
		alert("click");

	});
	Imagery.alpha(foo);
	Imagery.swapOnHover(foo, {
		ignore : function(){
			return $(this).data("ignore") == true;
		}

	});


	var bar = $(".bar");
	Imagery.alpha(bar);
	Imagery.swapOnHover(bar, {
		ignore : function(){
			return $(this).data("ignore") == true;
		}
	});


	var op = $(".opacity-test");
	Imagery.alpha(op);

	op.each(function(){
		Imagery.setOpacity(this, 0.3);
	});

	var fade = $(".fade-test");
	Imagery.alpha(fade);
	Imagery.fade(fade, 0);


	var blend = $(".blend-test");
	blend.on("click", function(){
		alert("blend click");
	});
	Imagery.alpha(blend);
	Imagery.blendOnHover(blend, {
		duration : 100,
		ignore : function(){
			return $(this).data("ignore") == true;
		}
	});


















}(jQuery));