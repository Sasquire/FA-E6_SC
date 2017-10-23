# FA-E6 Submission Comparison
Returns a list of submissions present on an artist's FurAffinity but not on e621 

## Dependency
Requires `request` and `promise`. Additionally you need a compiled version of [`iqdb`](https://www.iqdb.org/).

## How to use
  - Change Artist's name in `main.js`
  - Run `main.js`
  - Open `compare.html`

## Structure of Webpage
The right image in every block is a submission from FurAffinity while the image on the left is iqdb's best guess of what e621 is hosting.

## How it works
  - Obtains a list of posts on e621 using their api
  - Obtains a list of posts on FurAffinity using [boothale's API](http://faexport.boothale.net/)
  - Downloads all of these images
  - Creates an iqdb database of e621 images
  - Compares FurAffinity posts to the database and creates a webpage with the comparisons

## Notes
I would run my own instance of boothale's code but I can not get it to run.

Run's into problems with images that are not jpg/png/gif as it downloads the preview.

Also runs into problems when comparing images that make use of the alpha channel as the preview on e621 turns it black. I have tried to combat this but the success is weak to say the least.

This is version 1. Don't expect a version 2. If you come up with a fork make a pull request.

## Contact
  - [Github](https://github.com/sasquire)
  - [e621](https://e621.net/user/show/170289)
  - [FurAffinity](https://www.furaffinity.net/user/idem/)