const dayjs = require('dayjs');
const express = require('express');
const puppeteer = require('puppeteer');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello Asksuite World!');
});

// DESAFIO TESTE - ASKSUITE
// Gabriel Domingos Pinheiro de Sousa

// TODO implement endpoint here
// GET SUGGESTIONS ABOUT SUITES ON THE PROVIDED PERIOD
router.post('/search', async (req, res) => {
    const data = {
        checkin: req.body.checkin,
        checkout: req.body.checkout
    };

    // Check if the provided dates is before today, if it isn't return error
    const currentDate = dayjs(new Date()).format('YYYY-MM-DD')
    const isCheckinBeforeToday = dayjs(data.checkin).isBefore(currentDate);
    const isCheckoutBeforeToday = dayjs(data.checkout).isBefore(currentDate);
    const isCheckinToday = dayjs(data.checkin).isSame(currentDate);
    const isCheckoutBeforeCheckin = dayjs(data.checkout).isBefore(dayjs(data.checkin));
    const difference = dayjs(data.checkout).diff(dayjs(data.checkin), 'days');

    let isValidDates = false;

    if (isCheckinToday && !isCheckoutBeforeToday) {
        isValidDates = true;
    } else if (!isCheckinBeforeToday && !isCheckoutBeforeToday) {
        isValidDates = true;
    } else if (!isCheckoutBeforeCheckin) {
        isValidDates = true;
    }

    if (difference < 2) {
        isValidDates = false;
    }

    if (isValidDates) {
        try {
            // start puppeteer browser
            const browser = await puppeteer.launch({
                defaultViewport: null,
            });

            // open the page
            const page = await browser.newPage();
            // set the view scale to the page
            await page.setViewport({
                width: 1920,
                height: 1080
            });
            // go to the page provided to the test
            await page.goto(`
                https://pratagy.letsbook.com.br/D/Reserva?checkin=${data.checkin}&checkout=${data.checkout}&cidade=&hotel=12&adultos=2&criancas=&destino=Pratagy+Beach+Resort+All+Inclusive&promocode=&tarifa=&mesCalendario=6%2F14%2F2022
            `);

            // wait for networks to page be fully loaded
            await page.waitForNetworkIdle();
            // just for prove that the page is showing properly and the info is in the screen
            await page.screenshot({
                fullPage: true,
                path: "assets/sugestoes.png",
            })

            // the elements that has the room information
            const elements = await page.$$eval('div.room-list span .room-option-wrapper ', (item) => {
                return item.map(child => {

                    // regexp to get the image url, to process the string
                    const regexp = new RegExp('https.*?jpg');
                    // the path to get the url of the room image, is in the background-image: url(...)
                    const imageQuery = child.querySelector('.q-carousel__slide')?.style['background-image']
                    // get the image processing with regexp
                    const image = regexp.exec(imageQuery)[0];

                    // the info of the room
                    return {
                        name: child.querySelector('.room-option-title > h3 > span')?.innerText,
                        description: child.querySelector('.room-option-title > p')?.innerText,
                        price: child.querySelector('.daily-price > p.daily-price--total > strong > span.term')?.innerText,
                        image: image
                    }

                })
            });

            // close browser
            await browser.close();

            // return the rooms that match with the provided period
            if (elements.length > 0) {
                res.status(200).send(elements);
            } else {
                res.status(200).send({
                    message: 'Sorry, but we do not have rooms available for this date.'
                });
            }
        } catch (error) {
            res.status(400).send({
                error: error
            });
        }
    } else if (difference < 2) {
        res.status(400).send({
            error: `For you to stay on ${data.checkin}, you must stay at least 2 night(s)`
        });
    } else if (isCheckoutBeforeCheckin) {
        res.status(400).send({
            error: 'please, insert valid dates'
        });
    } else {
        res.status(400).send({
            error: 'please, insert days after today'
        });
    }
});

module.exports = router;